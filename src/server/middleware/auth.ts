import { Request, Response, NextFunction } from 'express';
import { verify } from 'jsonwebtoken';

export default function auth(req: Request, res: Response, next: NextFunction): void {
  // Check if authentication is enabled
  if (process.env.ENABLE_AUTH === 'false') {
    // Authentication disabled, proceed to next middleware
    return next();
  }

  const token = req.header('Authorization');

  if (!token) {
    res.status(401).json({ msg: 'No token, authorization denied' });
    return;
  }

  try {
    const decoded = verify(token, process.env.JWT_SECRET || '');
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
}

export function checkRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Check if authentication is enabled
    if (process.env.ENABLE_AUTH === 'false') {
      // Authentication disabled, proceed to next middleware
      return next();
    }

    // Check if user exists (should be set by auth middleware)
    if (!req.user) {
      res.status(401).json({ msg: 'No user found, authorization denied' });
      return;
    }

    // Check if user has required role
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ msg: 'Access denied, insufficient permissions' });
      return;
    }

    next();
  };
}
