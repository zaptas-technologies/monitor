import express from 'express';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// GET /api/projects - admin: all; user: only assigned
router.get('/', protect, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const projects = await Project.find()
        .populate('assignedTo', 'name email')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 });
      return res.json(projects);
    }
    const projects = await Project.find({ assignedTo: req.user._id })
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    res.json(projects);
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
    const { name, description, assignedTo, taskTitles, taskTitleConfigs } = req.body;
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
    const { name, description, assignedTo, taskTitles, taskTitleConfigs } = req.body;
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
