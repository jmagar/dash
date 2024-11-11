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
