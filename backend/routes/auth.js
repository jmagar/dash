const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../middleware/auth');
const cache = require('../cache');
const { pool } = require('../db');
const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  const { username, password, mfaToken } = req.body;

  try {
    // Check cache first
    const cachedUser = await cache.getUser(username);
    if (cachedUser) {
      const validPassword = await bcrypt.compare(password, cachedUser.password_hash);
      if (!validPassword) {
        return res.status(401).json({ success: false, error: 'Invalid password' });
      }

      // Check MFA if enabled
      if (cachedUser.mfa_enabled) {
        if (!mfaToken) {
          return res.json({ success: true, mfaRequired: true });
        }
        const validMfa = await validateMfaToken(cachedUser.id, mfaToken);
        if (!validMfa) {
          return res.status(401).json({ success: false, error: 'Invalid MFA code' });
        }
      }

      const token = jwt.sign({ userId: cachedUser.id }, process.env.JWT_SECRET);
      await cache.cacheSession(token, JSON.stringify(cachedUser));
      return res.json({ success: true, token, data: cachedUser });
    }

    // Get user from database
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ success: false, error: 'Invalid password' });
    }

    // Check MFA if enabled
    if (user.mfa_enabled) {
      if (!mfaToken) {
        return res.json({ success: true, mfaRequired: true });
      }
      const validMfa = await validateMfaToken(user.id, mfaToken);
      if (!validMfa) {
        return res.status(401).json({ success: false, error: 'Invalid MFA code' });
      }
    }

    // Cache user data
    await cache.cacheUser(username, user);

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
    await cache.cacheSession(token, JSON.stringify(user));

    // Update last login
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    res.json({ success: true, token, data: user });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Validate token
router.post('/validate', authenticateToken, async (req, res) => {
  res.json({ success: true, data: req.user });
});

// Refresh token
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    const newToken = jwt.sign({ userId: req.user.id }, process.env.JWT_SECRET);
    await cache.cacheSession(newToken, JSON.stringify(req.user));
    res.json({ success: true, token: newToken });
  } catch (err) {
    console.error('Token refresh error:', err);
    res.status(500).json({ success: false, error: 'Failed to refresh token' });
  }
});

// Logout
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    await cache.invalidateUserCache(req.user.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ success: false, error: 'Failed to logout' });
  }
});

// Update user
router.patch('/users/:id', authenticateToken, async (req, res) => {
  if (req.user.id !== parseInt(req.params.id)) {
    return res.status(403).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const { preferences } = req.body;
    const result = await pool.query(
      'UPDATE users SET preferences = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [preferences, req.user.id]
    );

    const updatedUser = result.rows[0];
    await cache.invalidateUserCache(req.user.id);
    await cache.cacheUser(updatedUser.username, updatedUser);

    res.json({ success: true, data: updatedUser });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ success: false, error: 'Failed to update user' });
  }
});

// Helper function to validate MFA token
async function validateMfaToken(userId, token) {
  const cachedToken = await cache.getMfaCode(userId);
  return cachedToken === token;
}

module.exports = router;
