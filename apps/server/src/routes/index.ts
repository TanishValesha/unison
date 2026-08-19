import { Router, type IRouter } from 'express';
import { healthRouter } from './healthRouter.js';
import { youtubeRouter } from './youtubeRouter.js';

const router: IRouter = Router();

router.use(healthRouter);
router.use('/youtube', youtubeRouter);

export { router as apiRouter };
