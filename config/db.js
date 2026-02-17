import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const uri = `mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@cluster0.dt9hl.mongodb.net/${process.env.MONGODB_DATABASENAME_without_space_without_specialchar}?retryWrites=true&w=majority`;
    await mongoose.connect(uri);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
};

export default connectDB;
