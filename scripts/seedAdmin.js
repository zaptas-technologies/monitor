/**
 * Run once to create first admin: node scripts/seedAdmin.js
 * Set ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME in .env
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';

const uri = `mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@cluster0.dt9hl.mongodb.net/${process.env.MONGODB_DATABASENAME_without_space_without_specialchar}?retryWrites=true&w=majority`;

async function seed() {
  await mongoose.connect(uri);
  const existing = await User.findOne({ role: 'admin' });
  if (existing) {
    console.log('Admin already exists:', existing.email);
    process.exit(0);
    return;
  }
  const email = process.env.ADMIN_EMAIL || 'admin@montor.local';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const name = process.env.ADMIN_NAME || 'Admin';
  await User.create({ name, email, password, role: 'admin' });
  console.log('Admin created:', email, '(change password after first login)');
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
