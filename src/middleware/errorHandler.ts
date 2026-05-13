import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';

export function notFound(req: Request, res: Response): void {
  const response: ApiResponse<null> = {
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
  };
  res.status(404).json(response);
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error(err.stack);
  const response: ApiResponse<null> = {
    success: false,
    error: 'Internal server error',
  };
  res.status(500).json(response);
}
