import mongoose from 'mongoose';

let isConnected = false;

export async function connectDB(): Promise<void> {
  if (isConnected) return;

  const uri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/interviewkit';

  await mongoose.connect(uri);
  isConnected = true;
  console.log('Connected to MongoDB');
}
