import express from 'express';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// GET /api/projects - admin: all; user: only assigned
router.get('/', protect, async (req, res) => {
  try {
    let query;
    if (req.user.role === 'admin') {
      query = {};
    } else {
      // For regular users: only projects assigned to them and that are active (or have no active flag)
      query = {
        assignedTo: req.user._id,
        $or: [{ active: true }, { active: { $exists: false } }],
      };
    }

    // Use lean() so we can safely attach computed fields (completion stats)
    const projects = await Project.find(query)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    const projectIds = projects.map((p) => p._id).filter(Boolean);
    if (projectIds.length === 0) return res.json(projects);

    // Aggregate task completion counts per project and per title (within project)
    const stats = await Task.aggregate([
      { $match: { project: { $in: projectIds } } },
      {
        $group: {
          _id: {
            project: '$project',
            titleLower: { $toLower: '$title' },
          },
          totalTasks: { $sum: 1 },
          completedTasks: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
        },
      },
    ]);

    const perProjectTotals = new Map(); // projectId -> { totalTasks, completedTasks }
    const perProjectTitle = new Map(); // `${projectId}||${titleLower}` -> { totalTasks, completedTasks }

    stats.forEach((row) => {
      const projectId = String(row._id.project);
      const titleLower = (row._id.titleLower || '').trim();
      const totalTasks = row.totalTasks || 0;
      const completedTasks = row.completedTasks || 0;

      // Aggregate totals per project
      const prevTotals = perProjectTotals.get(projectId) || { totalTasks: 0, completedTasks: 0 };
      perProjectTotals.set(projectId, {
        totalTasks: prevTotals.totalTasks + totalTasks,
        completedTasks: prevTotals.completedTasks + completedTasks,
      });

      if (titleLower) {
        perProjectTitle.set(`${projectId}||${titleLower}`, { totalTasks, completedTasks });
      }
    });

    const enriched = projects.map((p) => {
      const projectId = String(p._id);
      const totals = perProjectTotals.get(projectId) || { totalTasks: 0, completedTasks: 0 };
      const totalTasks = totals.totalTasks ?? 0;
      const completedTasks = totals.completedTasks ?? 0;
      const percent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Compute title-based completion: how many task titles are fully completed
      const titleSet = new Set();
      if (Array.isArray(p.taskTitleConfigs) && p.taskTitleConfigs.length > 0) {
        p.taskTitleConfigs.forEach((c) => {
          const t = c && c.title != null ? String(c.title).trim() : '';
          if (t) titleSet.add(t.toLowerCase());
        });
      } else if (Array.isArray(p.taskTitles) && p.taskTitles.length > 0) {
        p.taskTitles.forEach((raw) => {
          const t = raw && String(raw).trim();
          if (t) titleSet.add(t.toLowerCase());
        });
      }

      const allTitles = Array.from(titleSet);
      const totalTitles = allTitles.length;
      let completedTitles = 0;

      // Also build per-title status so the frontend can calculate "task days" using
      // actual completed titles, not an approximate ratio.
      const titleStatus = allTitles.map((tLower) => {
        const statsForTitle = perProjectTitle.get(`${projectId}||${tLower}`);
        const tTotal = statsForTitle?.totalTasks || 0;
        const tCompleted = statsForTitle?.completedTasks || 0;
        const isComplete = tTotal > 0 && tCompleted >= tTotal;
        if (isComplete) {
          completedTitles += 1;
        }
        return {
          titleLower: tLower,
          totalTasks: tTotal,
          completedTasks: tCompleted,
          isComplete,
        };
      });

      const titlePercent =
        totalTitles > 0 ? Math.round((completedTitles / totalTitles) * 100) : 0;

      return {
        ...p,
        completion: { totalTasks, completedTasks, percent },
        titleCompletion: {
          totalTitles,
          completedTitles,
          percent: titlePercent,
        },
        titleStatus,
      };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/projects/:id - single project with tasks (activities)
router.get('/:id', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');
    if (!project) return res.status(404).json({ message: 'Project not found' });
    const isAssigned = project.assignedTo.some((u) => u._id.toString() === req.user._id.toString());
    if (req.user.role !== 'admin' && !isAssigned) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const tasks = await Task.find({ project: project._id }).populate('createdBy', 'name email');
    res.json({ project, tasks });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/projects - create project (admin only)
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { name, description, assignedTo, taskTitles, taskTitleConfigs, active } = req.body;
    if (!name) return res.status(400).json({ message: 'Project name required' });
    let cleanedTaskTitles = [];
    if (Array.isArray(taskTitles)) {
      cleanedTaskTitles = taskTitles
        .map((t) => String(t).trim())
        .filter((t) => t.length > 0);
    }
    let cleanedConfigs = [];
    if (Array.isArray(taskTitleConfigs)) {
      cleanedConfigs = taskTitleConfigs
        .map((c) => ({
          title: c && c.title != null ? String(c.title).trim() : '',
          startDate: c && c.startDate ? new Date(c.startDate) : null,
          endDate: c && c.endDate ? new Date(c.endDate) : null,
        }))
        .filter((c) => c.title.length > 0);
      // ensure flat titles also contain these
      const configTitles = cleanedConfigs.map((c) => c.title);
      cleanedTaskTitles = Array.from(new Set([...cleanedTaskTitles, ...configTitles]));
    }
    const project = await Project.create({
      name,
      description: description || '',
      assignedTo: assignedTo || [],
      taskTitles: cleanedTaskTitles,
      taskTitleConfigs: cleanedConfigs,
      active: typeof active === 'boolean' ? active : true,
      createdBy: req.user._id,
    });
    const populated = await Project.findById(project._id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/projects/:id - update (admin only), e.g. assign users
router.patch('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { name, description, assignedTo, taskTitles, taskTitleConfigs, active } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (name != null) project.name = name;
    if (description != null) project.description = description;
    if (Array.isArray(assignedTo)) project.assignedTo = assignedTo;
    if (Array.isArray(taskTitles)) {
      project.taskTitles = taskTitles
        .map((t) => String(t).trim())
        .filter((t) => t.length > 0);
    }
    if (Array.isArray(taskTitleConfigs)) {
      const cleanedConfigs = taskTitleConfigs
        .map((c) => ({
          title: c && c.title != null ? String(c.title).trim() : '',
          startDate: c && c.startDate ? new Date(c.startDate) : null,
          endDate: c && c.endDate ? new Date(c.endDate) : null,
        }))
        .filter((c) => c.title.length > 0);
      project.taskTitleConfigs = cleanedConfigs;
      const configTitles = cleanedConfigs.map((c) => c.title);
      const mergedTitles = Array.from(new Set([...(project.taskTitles || []), ...configTitles]));
      project.taskTitles = mergedTitles;
    }
    if (typeof active === 'boolean') {
      project.active = active;
    }
    await project.save();
    const populated = await Project.findById(project._id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/projects/:id (admin only)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    await Task.updateMany({ project: project._id }, { $unset: { project: 1 } });
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
