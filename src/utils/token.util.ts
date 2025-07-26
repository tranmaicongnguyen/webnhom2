import jwt from 'jsonwebtoken';
import env from '../config/env.config';
import { IUser } from '../models/User.model';

export const generateToken = (user: IUser): string => {
  return jwt.sign(
    { id: user._id },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}; 