import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('[GLOBAL ERROR HANDLER]', err);

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  return res.status(statusCode).json({
    detail: message,
  });
}
