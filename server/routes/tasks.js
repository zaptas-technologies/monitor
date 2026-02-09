import express from 'express';
import Task from '../models/Task.js';
import Project from '../models/Project.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// GET /api/tasks - user: own tasks; admin: all or filter by user
router.get('/', protect, async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'user') {
      filter.createdBy = req.user._id;
    } else if (req.query.userId) {
      filter.createdBy = req.query.userId;
    }
    const tasks = await Task.find(filter)
      .populate('project', 'name')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/tasks/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('project', 'name')
      .populate('createdBy', 'name email');
    if (!task) return res.status(404).json({ message: 'Task not found' });
    const isOwner = task.createdBy._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      if (task.project) {
        const project = await Project.findById(task.project);
        const isAssigned = project?.assignedTo.some((id) => id.toString() === req.user._id.toString());
        if (!isAssigned) return res.status(403).json({ message: 'Access denied' });
      } else return res.status(403).json({ message: 'Access denied' });
    }
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/tasks - create task (user adds their task; admin can set createdBy for assignment)
router.post('/', protect, async (req, res) => {
  try {
    const {
      title,
      description,
      status,
      dueDate,
      timeSpentMinutes,
      project,
      createdBy,
      titleStartDate,
      titleEndDate,
      titleTotalDays,
    } = req.body;
    if (!title) return res.status(400).json({ message: 'Task title required' });
    const ownerId = req.user.role === 'admin' && createdBy ? createdBy : req.user._id;
    if (project) {
      const proj = await Project.findById(project);
      const isAssigned = proj?.assignedTo.some((id) => id.toString() === ownerId.toString());
      if (!proj || (req.user.role !== 'admin' && !isAssigned)) {
        return res.status(400).json({ message: 'Invalid or unauthorized project' });
      }
    }
    const task = await Task.create({
      title,
      description: description || '',
      status: status || 'pending',
      dueDate: dueDate || null,
      timeSpentMinutes: timeSpentMinutes ?? 0,
      project: project || null,
      createdBy: ownerId,
    });
    if (project && title) {
      const trimmedTitle = String(title).trim();
      if (trimmedTitle) {
        let start = null;
        let end = null;
        if (titleStartDate) {
          const s = new Date(titleStartDate);
          if (!Number.isNaN(s.getTime())) start = s;
        }
        if (titleEndDate) {
          const e = new Date(titleEndDate);
          if (!Number.isNaN(e.getTime())) end = e;
        } else if (titleStartDate && titleTotalDays) {
          const s = new Date(titleStartDate);
          if (!Number.isNaN(s.getTime()) && Number(titleTotalDays) > 0) {
            s.setDate(s.getDate() + Number(titleTotalDays) - 1);
            end = s;
          }
        }

        const update = {
          $addToSet: {
            taskTitles: trimmedTitle,
          },
        };
        if (start || end) {
          update.$addToSet.taskTitleConfigs = {
            title: trimmedTitle,
            startDate: start || null,
            endDate: end || null,
          };
        } else {
          update.$addToSet.taskTitleConfigs = { title: trimmedTitle };
        }

        await Project.findByIdAndUpdate(project, update);
      }
    }
    const populated = await Task.findById(task._id)
      .populate('project', 'name')
      .populate('createdBy', 'name email');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/tasks/:id - update task
router.patch('/:id', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    const isOwner = task.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Access denied' });
    const { title, description, status, dueDate, timeSpentMinutes, project } = req.body;
    if (title != null) task.title = title;
    if (description != null) task.description = description;
    if (status != null) task.status = status;
    if (dueDate != null) task.dueDate = dueDate;
    if (timeSpentMinutes != null) task.timeSpentMinutes = timeSpentMinutes;
    if (project != null) task.project = project;
    await task.save();
    if (task.project && task.title) {
      const trimmedTitle = String(task.title).trim();
      if (trimmedTitle) {
        await Project.findByIdAndUpdate(task.project, {
          $addToSet: {
            taskTitles: trimmedTitle,
            taskTitleConfigs: { title: trimmedTitle },
          },
        });
      }
    }
    const populated = await Task.findById(task._id)
      .populate('project', 'name')
      .populate('createdBy', 'name email');
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    const isOwner = task.createdBy.toString() === req.user._id.toString();
    if (req.user.role !== 'admin' && !isOwner) return res.status(403).json({ message: 'Access denied' });
    await task.deleteOne();
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
