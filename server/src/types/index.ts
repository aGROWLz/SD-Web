import { Request } from 'express';
import { JwtPayload } from '../utils/jwt';

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}
