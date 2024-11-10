import bcrypt from 'bcrypt';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import type { User, AuthResult } from '../../types';
import type { ApiResult } from '../../types/api-shared';
import { db } from '../db';

export async function login(req: Request, res: Response): Promise<void> {
  const { username, password, _remember } = req.body;

  try {
    const user = await db.query<User>('SELECT * FROM users WHERE username = $1', [username]);

    if (!user.rows.length) {
      res.status(401).json({
        success: false,
        error: 'Invalid username or password',
      });
      return;
    }

    const validPassword = await bcrypt.compare(password, user.rows[0].password);

    if (!validPassword) {
      res.status(401).json({
        success: false,
        error: 'Invalid username or password',
      });
      return;
    }

    const token = jwt.sign(
      { id: user.rows[0].id, username: user.rows[0].username },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' },
    );

    const authResult: AuthResult = {
      success: true,
      token,
      data: user.rows[0],
    };

    const result: ApiResult<AuthResult> = {
      success: true,
      data: authResult,
    };

    res.json(result);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}
