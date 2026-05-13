import { Router, Request, Response } from 'express';
import { users } from '../data/mockData';
import { ApiResponse, User } from '../types';

const router = Router();

router.post('/register', (req: Request, res: Response) => {
  const { fullName, dateOfBirth, phoneNumber, email } = req.body;

  if (!fullName || !dateOfBirth || !phoneNumber || !email) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'fullName, dateOfBirth, phoneNumber, and email are required',
    };
    return res.status(400).json(response);
  }

  const existing = users.find((u) => u.email === email || u.phoneNumber === phoneNumber);
  if (existing) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'A user with this email or phone number already exists',
    };
    return res.status(409).json(response);
  }

  const newUser: User = {
    id: `user-${String(users.length + 1).padStart(3, '0')}`,
    fullName,
    dateOfBirth,
    phoneNumber,
    email,
    bvnVerified: false,
    riskCategory: 'medium',
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);

  const response: ApiResponse<{ user: User; token: string }> = {
    success: true,
    message: 'Registration successful',
    data: {
      user: newUser,
      token: `mock-jwt-token-${newUser.id}`,
    },
  };
  return res.status(201).json(response);
});

router.post('/login', (req: Request, res: Response) => {
  const { phoneNumber, email } = req.body;

  if (!phoneNumber && !email) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'phoneNumber or email is required',
    };
    return res.status(400).json(response);
  }

  const user = users.find(
    (u) =>
      (email && u.email === email) ||
      (phoneNumber && u.phoneNumber === phoneNumber)
  );

  if (!user) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'User not found',
    };
    return res.status(404).json(response);
  }

  const response: ApiResponse<{ user: User; token: string }> = {
    success: true,
    message: 'Login successful',
    data: {
      user,
      token: `mock-jwt-token-${user.id}`,
    },
  };
  return res.status(200).json(response);
});

export default router;
