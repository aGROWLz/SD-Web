import { Router } from 'express';
import { getMyKeys, addUserKey, deleteKey } from '../controllers/key.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getMyKeys);
router.post('/', addUserKey);
router.delete('/:id', deleteKey);

export default router;
