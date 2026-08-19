import { Router } from 'express';
import {
  getAllUsers,
  getStorageConfig,
  updateStorageConfig,
  updateGenerationAccess,
} from '../controllers/admin.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { UserRole } from '../types';
import { validateGenerationAccess, validateParamId } from '../middlewares/validator';

const router = Router();

router.use(authenticate);
router.use(requireRole(UserRole.ADMIN));

router.get('/users', getAllUsers);
router.patch('/users/:id/generation-access', validateParamId('id'), validateGenerationAccess, updateGenerationAccess);
router.get('/storage', getStorageConfig);
router.put('/storage', updateStorageConfig);

export default router;
