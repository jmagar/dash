import { compare } from 'bcrypt';
import { Request, Response } from 'express';
import { sign } from 'jsonwebtoken';

import type { User, AuthResult } from '../../types';
import type { ApiResult } from '../../types/api-shared';
import { query } from '../db';

export async function login(req: Request, res: Response): Promise<void> {
  const { username, password, _remember } = req.body;

  try {
    const result = await query<User>('SELECT * FROM users WHERE username = $1', [username]);

    if (!result.rows.length) {
      res.status(401).json({
        success: false,
        error: 'Invalid username or password',
      });
      return;
    }

    const validPassword = await compare(password, result.rows[0].password);

    if (!validPassword) {
      res.status(401).json({
        success: false,
        error: 'Invalid username or password',
      });
      return;
    }

    const token = sign(
      { id: result.rows[0].id, username: result.rows[0].username },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' },
    );

    const authResult: AuthResult = {
      success: true,
      token,
      data: result.rows[0],
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
