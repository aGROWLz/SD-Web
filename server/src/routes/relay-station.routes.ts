import { Router } from 'express';
import {
  createRelayStation,
  deleteRelayStation,
  getRelayStations,
  setPrimaryRelayStation,
  testRelayStation,
  updateRelayStation,
} from '../controllers/relay-station.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { UserRole } from '../types';
import { validateParamId, validateRelayStation } from '../middlewares/validator';

const router = Router();
router.use(authenticate, requireRole(UserRole.ADMIN));
router.get('/', getRelayStations);
router.post('/', validateRelayStation, createRelayStation);
router.patch('/:id', validateParamId('id'), validateRelayStation, updateRelayStation);
router.patch('/:id/primary', validateParamId('id'), setPrimaryRelayStation);
router.post('/:id/test', validateParamId('id'), testRelayStation);
router.delete('/:id', validateParamId('id'), deleteRelayStation);

export default router;
