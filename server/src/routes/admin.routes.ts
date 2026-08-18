import { Router } from 'express';
import {
  getPlatformKeys,
  addPlatformKey,
  updateKeyStatus,
  getAllUsers,
} from '../controllers/admin.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { UserRole } from '../types';

const router = Router();

router.use(authenticate);
router.use(requireRole(UserRole.ADMIN));

router.get('/keys', getPlatformKeys);
router.post('/keys', addPlatformKey);
router.patch('/keys/:id', updateKeyStatus);
router.get('/users', getAllUsers);

export default router;
