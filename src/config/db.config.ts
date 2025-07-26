import mongoose from 'mongoose';
import env from './env.config';

export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(env.mongodbUri);
    console.log(`MongoDB đã kết nối: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Lỗi kết nối MongoDB: ${(error as Error).message}`);
    process.exit(1);
  }
}; 