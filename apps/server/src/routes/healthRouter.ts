import { Router, type IRouter } from 'express';
import { healthController } from '../controllers/healthController.js';

const router: IRouter = Router();

router.get('/health', healthController);

export { router as healthRouter };