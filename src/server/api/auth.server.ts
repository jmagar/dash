import { compare } from 'bcrypt';
import { Request, Response } from 'express';
import { sign } from 'jsonwebtoken';

import type { AuthResult } from '../../types';
import type { ApiResult } from '../../types/api-shared';
import type { User } from '../../types/auth';
import { query } from '../db';

export async function login(req: Request, res: Response): Promise<void> {
  const { username, password, _remember } = req.body;

  try {
    const result = await query<User>('SELECT * FROM users WHERE username = $1', [username]);

    const user = result.rows[0];
    if (!user || !user.password_hash) {
      res.status(401).json({
        success: false,
        error: 'Invalid username or password',
      });
      return;
    }

    const validPassword = await compare(password, user.password_hash);

    if (!validPassword) {
      res.status(401).json({
        success: false,
        error: 'Invalid username or password',
      });
      return;
    }

    const token = sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' },
    );

    const authResult: AuthResult = {
      success: true,
      token,
      data: {
        id: user.id,
        username: user.username,
        role: user.role,
        email: undefined,
        lastLogin: user.last_login,
      },
    };

    const apiResult: ApiResult<AuthResult> = {
      success: true,
      data: authResult,
    };

    res.json(apiResult);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}
