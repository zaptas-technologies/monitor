/**
 * Seed sample Indian IT company data.
 * Users: Kush (admin), Anjali, Priyanshu, Himanshu — all password: 123456
 * Run: node scripts/seedSampleData.js
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';

const uri = `mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@cluster0.dt9hl.mongodb.net/${process.env.MONGODB_DATABASENAME_without_space_without_specialchar}?retryWrites=true&w=majority`;

const SAMPLE_PASSWORD = '123456';

const USERS = [
  { name: 'Kush', email: 'kush@zaptas.in', role: 'admin' },
  { name: 'Anjali', email: 'anjali@zaptas.in', role: 'user' },
  { name: 'Priyanshu', email: 'priyanshu@zaptas.in', role: 'user' },
  { name: 'Himanshu', email: 'himanshu@zaptas.in', role: 'user' },
];

async function ensureUser(data) {
  let user = await User.findOne({ email: data.email });
  if (!user) {
    user = await User.create({ ...data, password: SAMPLE_PASSWORD });
    console.log('Created user:', data.email);
  } else {
    console.log('User already exists:', data.email);
  }
  return user;
}

async function seed() {
  await mongoose.connect(uri);
  console.log('MongoDB connected\n--- Seeding sample data ---\n');

  const users = {};
  for (const u of USERS) {
    const user = await ensureUser(u);
    users[u.email] = user;
  }

  const admin = users['kush@zaptas.in'];
  const [anjali, priyanshu, himanshu] = [
    users['anjali@zaptas.in'],
    users['priyanshu@zaptas.in'],
    users['himanshu@zaptas.in'],
  ];

  const projectData = [
    {
      name: 'E-Commerce Platform',
      description: 'B2B e-commerce portal for wholesale orders and inventory management. Stack: React, Node, MongoDB.',
      assignedTo: [anjali._id, priyanshu._id],
      createdBy: admin._id,
    },
    {
      name: 'HRMS Portal',
      description: 'Human Resource Management System for leave, attendance, and payroll. Used by 200+ employees.',
      assignedTo: [anjali._id, himanshu._id],
      createdBy: admin._id,
    },
    {
      name: 'Banking API Integration',
      description: 'REST APIs for third-party banking and UPI integration. PCI-DSS compliance required.',
      assignedTo: [priyanshu._id, himanshu._id],
      createdBy: admin._id,
    },
    {
      name: 'Mobile App - Android',
      description: 'Customer-facing Android app for Zaptas services. Kotlin, Jetpack Compose.',
      assignedTo: [himanshu._id],
      createdBy: admin._id,
    },
  ];

  const createdProjects = [];
  for (const p of projectData) {
    const proj = await Project.create(p);
    createdProjects.push(proj);
    console.log('Created project:', proj.name);
  }

  const now = new Date();
  const inDays = (d) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

  const taskData = [
    { title: 'Cart and checkout flow', description: 'Implement cart persistence and checkout with Razorpay.', status: 'in_progress', dueDate: inDays(7), timeSpentMinutes: 480, project: createdProjects[0]._id, createdBy: anjali._id },
    { title: 'Product search and filters', description: 'Elasticsearch integration for search; category filters.', status: 'completed', dueDate: inDays(-3), timeSpentMinutes: 720, project: createdProjects[0]._id, createdBy: priyanshu._id },
    { title: 'Leave approval workflow', description: 'Multi-level approval and notifications.', status: 'pending', dueDate: inDays(14), timeSpentMinutes: 0, project: createdProjects[1]._id, createdBy: anjali._id },
    { title: 'Attendance punch integration', description: 'Biometric device API and daily reports.', status: 'in_progress', dueDate: inDays(5), timeSpentMinutes: 300, project: createdProjects[1]._id, createdBy: himanshu._id },
    { title: 'Account balance API', description: 'Secure endpoint for balance enquiry; rate limiting.', status: 'completed', dueDate: inDays(-5), timeSpentMinutes: 600, project: createdProjects[2]._id, createdBy: priyanshu._id },
    { title: 'UPI callback handling', description: 'Webhook for payment status and idempotency.', status: 'in_progress', dueDate: inDays(3), timeSpentMinutes: 240, project: createdProjects[2]._id, createdBy: himanshu._id },
    { title: 'Login and profile screen', description: 'JWT auth and profile edit with avatar upload.', status: 'completed', dueDate: inDays(-7), timeSpentMinutes: 360, project: createdProjects[3]._id, createdBy: himanshu._id },
    { title: 'Offline support', description: 'Room DB cache and sync when online.', status: 'pending', dueDate: inDays(21), timeSpentMinutes: 0, project: createdProjects[3]._id, createdBy: himanshu._id },
  ];

  for (const t of taskData) {
    await Task.create(t);
    console.log('Created task:', t.title);
  }

  console.log('\n--- Done. All passwords are: 123456 ---');
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
