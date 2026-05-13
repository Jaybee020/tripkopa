import { Router, Request, Response } from 'express';
import { wallets, walletTransactions, users, generateId } from '../data/mockData';
import { ApiResponse, Wallet, WalletTransaction } from '../types';

const router = Router();

router.post('/', (req: Request, res: Response) => {
  const { userId } = req.body;

  if (!userId) {
    const response: ApiResponse<null> = { success: false, error: 'userId is required' };
    return res.status(400).json(response);
  }

  const user = users.find((u) => u.id === userId);
  if (!user) {
    const response: ApiResponse<null> = { success: false, error: 'User not found' };
    return res.status(404).json(response);
  }

  if (!user.bvnVerified) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'BVN must be verified before creating a wallet',
    };
    return res.status(400).json(response);
  }

  const existing = wallets.find((w) => w.userId === userId);
  if (existing) {
    const response: ApiResponse<Wallet> = {
      success: true,
      message: 'Wallet already exists',
      data: existing,
    };
    return res.status(200).json(response);
  }

  const accountNumber = `90${Math.floor(10000000 + Math.random() * 90000000)}`;

  const newWallet: Wallet = {
    id: generateId('wallet'),
    userId,
    accountNumber,
    bankName: 'Tripkopa Virtual Bank',
    balance: 0,
    currency: 'NGN',
    createdAt: new Date().toISOString(),
  };

  wallets.push(newWallet);

  const response: ApiResponse<{
    wallet: Wallet;
    instructions: string[];
  }> = {
    success: true,
    message: 'Wallet created successfully',
    data: {
      wallet: newWallet,
      instructions: [
        `Transfer your deposit to account number ${accountNumber} at Tripkopa Virtual Bank.`,
        'Use your registered phone number as the transfer reference.',
        'Your deposit will be confirmed within minutes.',
        'You can top up your wallet at any time to stay ahead on repayments.',
      ],
    },
  };
  return res.status(201).json(response);
});

router.get('/user/:userId', (req: Request, res: Response) => {
  const wallet = wallets.find((w) => w.userId === req.params.userId);

  if (!wallet) {
    const response: ApiResponse<null> = { success: false, error: 'Wallet not found' };
    return res.status(404).json(response);
  }

  const response: ApiResponse<Wallet> = { success: true, data: wallet };
  return res.status(200).json(response);
});

router.get('/:walletId/transactions', (req: Request, res: Response) => {
  const wallet = wallets.find((w) => w.id === req.params.walletId);

  if (!wallet) {
    const response: ApiResponse<null> = { success: false, error: 'Wallet not found' };
    return res.status(404).json(response);
  }

  const transactions = walletTransactions
    .filter((t) => t.walletId === req.params.walletId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const response: ApiResponse<{ transactions: WalletTransaction[]; count: number }> = {
    success: true,
    data: { transactions, count: transactions.length },
  };
  return res.status(200).json(response);
});

router.post('/:walletId/deposit', (req: Request, res: Response) => {
  const wallet = wallets.find((w) => w.id === req.params.walletId);

  if (!wallet) {
    const response: ApiResponse<null> = { success: false, error: 'Wallet not found' };
    return res.status(404).json(response);
  }

  const { amount, reference, description } = req.body;

  if (!amount || Number(amount) <= 0) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'A positive amount is required',
    };
    return res.status(400).json(response);
  }

  wallet.balance += Number(amount);

  const transaction: WalletTransaction = {
    id: generateId('txn'),
    walletId: wallet.id,
    type: 'deposit',
    amount: Number(amount),
    reference: reference || `TK-DEP-${Date.now()}`,
    description: description || 'Wallet deposit',
    status: 'completed',
    createdAt: new Date().toISOString(),
  };

  walletTransactions.push(transaction);

  const response: ApiResponse<{ transaction: WalletTransaction; newBalance: number }> = {
    success: true,
    message: 'Deposit recorded successfully',
    data: { transaction, newBalance: wallet.balance },
  };
  return res.status(200).json(response);
});

export default router;
