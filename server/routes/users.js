import express from 'express';
import User from '../models/User.js';
import Task from '../models/Task.js';
import Project from '../models/Project.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// GET /api/users - list all users (admin only)
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find().select('-password').populate('createdBy', 'name email').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/users/:id - get one user + their tasks & projects (admin can see any; user only self)
router.get('/:id', protect, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const targetId = req.params.id;
    if (!isAdmin && req.user._id.toString() !== targetId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const user = await User.findById(targetId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    const tasks = await Task.find({ createdBy: targetId }).populate('project', 'name');
    const assignedProjects = await Project.find({ assignedTo: targetId });
    res.json({ user, tasks, assignedProjects });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
