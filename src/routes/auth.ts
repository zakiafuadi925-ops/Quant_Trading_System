import { Router } from 'express';
import { registerUser, loginUser, getCurrentUser } from '../controllers/authController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { authRateLimiter } from '../middlewares/rateLimiter.js';
import { sanitizeInputs } from '../middlewares/sanitizer.js';

const router = Router();

router.post('/register', authRateLimiter, sanitizeInputs, registerUser);
router.post('/login', authRateLimiter, sanitizeInputs, loginUser);
router.get('/me', authenticateToken, getCurrentUser);

export default router;
