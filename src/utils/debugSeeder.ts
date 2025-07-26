import mongoose from 'mongoose';
import dotenv from 'dotenv';
import colors from 'colors';
import { connectDB } from '../config/db.config';
import bcrypt from 'bcryptjs';

// Configure environment
dotenv.config();
colors.enable();

const checkSeededData = async () => {
  try {
    // Connect to database
    await connectDB();
    
    console.log('Checking seeded data...');
    
    // Check users collection
    const usersCollection = mongoose.connection.collection('users');
    const adminUser = await usersCollection.findOne({ email: 'admin@webfashion.com' });
    
    if (adminUser) {
      console.log('Admin user found:');
      console.log('- ID:', adminUser._id);
      console.log('- Name:', adminUser.name);
      console.log('- Email:', adminUser.email);
      console.log('- Role:', adminUser.role);
      console.log('- IsAdmin:', adminUser.isAdmin);
      console.log('- Password hash:', adminUser.password);

      // Test password match
      const plainPassword = '123456';
      const isMatch = await bcrypt.compare(plainPassword, adminUser.password);
      console.log('Password "123456" matches:', isMatch);
      
      // If password doesn't match, let's create a new hash and show it
      if (!isMatch) {
        const salt = await bcrypt.genSalt(10);
        const newHash = await bcrypt.hash(plainPassword, salt);
        console.log('Generated new password hash for "123456":', newHash);
      }
    } else {
      console.log('Admin user not found!');
      
      // Show all users in the collection
      console.log('\nAll users in database:');
      const allUsers = await usersCollection.find({}).toArray();
      allUsers.forEach((user, index) => {
        console.log(`\nUser #${index + 1}:`);
        console.log('- ID:', user._id);
        console.log('- Name:', user.name);
        console.log('- Email:', user.email);
        console.log('- Role:', user.role);
        console.log('- IsAdmin:', user.isAdmin);
        console.log('- Password hash:', user.password);
      });
    }

    process.exit(0);
  } catch (error: any) {
    console.error(`Error: ${error.message}`.red);
    process.exit(1);
  }
};

// Run the check
checkSeededData(); 