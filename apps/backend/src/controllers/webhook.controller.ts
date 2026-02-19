import { Request, Response } from 'express';

export const verifyWebhook = async (req: Request, res: Response) => {
  res.send(req.query['hub.challenge']);
};

export const handleWebhook = async (req: Request, res: Response) => {
  res.status(200).send('EVENT_RECEIVED');
};
