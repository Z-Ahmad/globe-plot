import { Request, Response, NextFunction } from 'express';
import { auth } from '../services/firebase/admin';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email?: string;
      };
    }
  }
}

/**
 * Middleware to authenticate requests using Firebase ID tokens
 * Expects Authorization header with format: "Bearer <token>"
 */
export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header. Expected format: "Bearer <token>"'
      });
      return;
    }

    const token = authHeader.split('Bearer ')[1];

    if (!token) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'No token provided'
      });
      return;
    }

    try {
      // Verify the Firebase ID token
      const decodedToken = await auth.verifyIdToken(token);
      
      // Attach user info to request
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email
      };

      next();
    } catch (verifyError: any) {
      console.error('Token verification failed:', verifyError.message);
      
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      });
      return;
    }
  } catch (error: any) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Authentication failed'
    });
    return;
  }
};

/**
 * Optional middleware - doesn't fail if no auth provided
 * Useful for endpoints that work better with auth but don't require it
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await auth.verifyIdToken(token);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email
    };
  } catch (error) {
    // Silently fail for optional auth
    console.log('Optional auth failed, continuing without user context');
  }

  next();
};
