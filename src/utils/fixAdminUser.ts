import mongoose from 'mongoose';
import dotenv from 'dotenv';
import colors from 'colors';
import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db.config';

// Configure environment
dotenv.config();
colors.enable();

const createAdminUser = async () => {
  try {
    // Connect to database
    await connectDB();
    
    console.log('Creating admin user...');
    
    // Get users collection directly
    const usersCollection = mongoose.connection.collection('users');
    
    // First delete any existing admin
    await usersCollection.deleteOne({ email: 'admin@webfashion.com' });
    console.log('Deleted existing admin user if any');
    
    // Hash password manually
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('123456', salt);
    
    // Create admin user directly in the collection
    const result = await usersCollection.insertOne({
      name: 'Admin User',
      email: 'admin@webfashion.com',
      password: hashedPassword,
      role: 'admin',
      isAdmin: true,
      address: '123 Admin Street',
      phone: '0123456789',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log('Admin user created successfully:');
    console.log('- ID:', result.insertedId);
    console.log('- Password hash:', hashedPassword);
    console.log('- Plain password: 123456');
    
    // Verify the password hash works
    const verifyResult = await bcrypt.compare('123456', hashedPassword);
    console.log('Password verification test:', verifyResult ? 'PASSED' : 'FAILED');
    
    process.exit(0);
  } catch (error: any) {
    console.error(`Error: ${error.message}`.red);
    process.exit(1);
  }
};

// Run the script
createAdminUser(); 