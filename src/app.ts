import express from 'express';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import flightRoutes from './routes/flights';
import walletRoutes from './routes/wallets';
import bookingRoutes from './routes/bookings';
import repaymentRoutes from './routes/repayments';
import { notFound, errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'Tripkopa API is running', version: '1.0.0' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/flights', flightRoutes);
app.use('/api/wallets', walletRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/repayments', repaymentRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Tripkopa API running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

export default app;
