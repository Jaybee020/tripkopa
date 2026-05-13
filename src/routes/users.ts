import { Router, Request, Response } from 'express';
import { users } from '../data/mockData';
import { ApiResponse, User, RiskCategory } from '../types';

const router = Router();

router.get('/:id', (req: Request, res: Response) => {
  const user = users.find((u) => u.id === req.params.id);

  if (!user) {
    const response: ApiResponse<null> = { success: false, error: 'User not found' };
    return res.status(404).json(response);
  }

  const response: ApiResponse<User> = { success: true, data: user };
  return res.status(200).json(response);
});

router.patch('/:id', (req: Request, res: Response) => {
  const index = users.findIndex((u) => u.id === req.params.id);

  if (index === -1) {
    const response: ApiResponse<null> = { success: false, error: 'User not found' };
    return res.status(404).json(response);
  }

  const allowedFields: (keyof User)[] = ['fullName', 'dateOfBirth', 'phoneNumber', 'email'];
  const updates: Partial<User> = {};

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      (updates as Record<string, unknown>)[field] = req.body[field];
    }
  }

  users[index] = { ...users[index], ...updates };

  const response: ApiResponse<User> = {
    success: true,
    message: 'Profile updated',
    data: users[index],
  };
  return res.status(200).json(response);
});

router.post('/:id/verify-bvn', (req: Request, res: Response) => {
  const user = users.find((u) => u.id === req.params.id);

  if (!user) {
    const response: ApiResponse<null> = { success: false, error: 'User not found' };
    return res.status(404).json(response);
  }

  const { bvn } = req.body;

  if (!bvn || String(bvn).length !== 11) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'A valid 11-digit BVN is required',
    };
    return res.status(400).json(response);
  }

  user.bvnVerified = true;

  const response: ApiResponse<{ verified: boolean; userId: string }> = {
    success: true,
    message: 'BVN verified successfully',
    data: { verified: true, userId: user.id },
  };
  return res.status(200).json(response);
});

router.get('/:id/risk', (req: Request, res: Response) => {
  const user = users.find((u) => u.id === req.params.id);

  if (!user) {
    const response: ApiResponse<null> = { success: false, error: 'User not found' };
    return res.status(404).json(response);
  }

  if (!user.bvnVerified) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'BVN must be verified before risk qualification',
    };
    return res.status(400).json(response);
  }

  const riskDetails: Record<
    RiskCategory,
    { eligible: boolean; bookingType: string; description: string }
  > = {
    low: {
      eligible: true,
      bookingType: 'instant',
      description:
        'You qualify for instant booking. Your booking will be confirmed immediately after deposit.',
    },
    medium: {
      eligible: true,
      bookingType: 'triplock',
      description:
        'You qualify for Triplock booking. Your booking will be confirmed after reaching the required repayment milestone.',
    },
    high: {
      eligible: false,
      bookingType: 'restricted',
      description:
        'Your account requires additional review. Please contact support.',
    },
  };

  const response: ApiResponse<{
    riskCategory: RiskCategory;
    eligible: boolean;
    bookingType: string;
    description: string;
  }> = {
    success: true,
    data: {
      riskCategory: user.riskCategory,
      ...riskDetails[user.riskCategory],
    },
  };
  return res.status(200).json(response);
});

export default router;
