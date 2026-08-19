import { Router, type IRouter, type Request, type Response } from 'express';
import { searchYouTube, getVideoDetails } from '../youtube';

const router: IRouter = Router();

/**
 * GET /api/youtube/search?q=...&limit=10
 * Search YouTube for music videos.
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    if (!query || query.trim().length === 0) {
      res.status(400).json({ error: 'Query parameter "q" is required' });
      return;
    }

    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 10;
    const tracks = await searchYouTube(query.trim(), limit);

    res.json({ tracks });
  } catch (error) {
    console.error('YouTube search error:', error);
    res.status(500).json({ error: 'Failed to search YouTube' });
  }
});

/**
 * GET /api/youtube/video/:videoId
 * Get detailed information for a single YouTube video.
 */
router.get('/video/:videoId', async (req: Request, res: Response) => {
  try {
    const videoId = String(req.params.videoId);
    if (!videoId) {
      res.status(400).json({ error: 'videoId is required' });
      return;
    }

    const track = await getVideoDetails(videoId);
    res.json({ track });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Video not found')) {
      res.status(404).json({ error: error.message });
      return;
    }
    console.error('YouTube video details error:', error);
    res.status(500).json({ error: 'Failed to get video details' });
  }
});

export { router as youtubeRouter };