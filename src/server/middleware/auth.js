import jwt from 'jsonwebtoken';

export default function auth(req, res, next) {
  // Check if authentication is enabled
  if (process.env.ENABLE_AUTH === 'false') {
    // Authentication disabled, proceed to next middleware
    return next();
  }

  const token = req.header('Authorization');

  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
}

export function checkRole(roles) {
  return (req, res, next) => {
    // Check if authentication is enabled
    if (process.env.ENABLE_AUTH === 'false') {
      // Authentication disabled, proceed to next middleware
      return next();
    }

    // Check if user exists (should be set by auth middleware)
    if (!req.user) {
      return res.status(401).json({ msg: 'No user found, authorization denied' });
    }

    // Check if user has required role
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ msg: 'Access denied, insufficient permissions' });
    }

    next();
  };
}
