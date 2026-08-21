import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validateParamId } from '../middlewares/validator';
import {
  createPublicAsset,
  deletePublicAssetController,
  getPublicAssetFile,
  getPublicAssetFileByProviderId,
  refreshPublicAssetStatuses,
  listPublicAssetController,
  retryPublicAssetController,
} from '../controllers/asset.controller';

const router = Router();
router.use(authenticate);
router.get('/', listPublicAssetController);
router.post('/', createPublicAsset);
router.post('/refresh-status', refreshPublicAssetStatuses);
router.get('/provider/:providerId/file', getPublicAssetFileByProviderId);
router.get('/:id/file', validateParamId('id'), getPublicAssetFile);
router.post('/:id/retry', validateParamId('id'), retryPublicAssetController);
router.delete('/:id', validateParamId('id'), deletePublicAssetController);
export default router;
