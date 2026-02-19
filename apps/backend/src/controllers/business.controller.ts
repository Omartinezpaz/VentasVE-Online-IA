import { Request, Response } from 'express';

export const getMe = async (req: Request, res: Response) => {
  res.json({ message: 'Get business details endpoint' });
};

export const updateMe = async (req: Request, res: Response) => {
  res.json({ message: 'Update business endpoint' });
};

export const getStats = async (req: Request, res: Response) => {
  res.json({ message: 'Get business stats endpoint' });
};

export const inviteUser = async (req: Request, res: Response) => {
  res.json({ message: 'Invite user endpoint' });
};
