import { Request, Response } from 'express';


export const getStatus = (req: Request, res: Response): void => {
  res.json({ status: 'ok' });
};
