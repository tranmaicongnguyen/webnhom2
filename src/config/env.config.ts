import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5001,
  mongodbUri: process.env.MONGODB_URI || 'mongodb+srv://khaichay1907:NrU9aVsvjrT6P2tA@cluster0.xhepl81.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0',
  jwtSecret: process.env.JWT_SECRET || 'webgiay_secret_key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  
  // Derived properties
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
};

export default env; 