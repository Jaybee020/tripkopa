import { Router, Request, Response } from 'express';
import {
  bookings,
  flights,
  users,
  wallets,
  walletTransactions,
  repaymentPlans,
  generateId,
} from '../data/mockData';
import {
  ApiResponse,
  Booking,
  PartialItinerary,
  FullItinerary,
  RouteType,
  Instalment,
  RepaymentPlan,
} from '../types';

const router = Router();

function getDepositPercent(routeType: RouteType): number {
  return routeType === 'domestic' ? 30 : routeType === 'regional' ? 40 : 50;
}

function getMaxFinancingWeeks(routeType: RouteType): number {
  return routeType === 'domestic' ? 12 : routeType === 'regional' ? 16 : 24;
}

function getInstalmentLimits(routeType: RouteType): { min: number; max: number } {
  if (routeType === 'domestic') return { min: 2, max: 4 };
  if (routeType === 'regional') return { min: 3, max: 6 };
  return { min: 4, max: 8 };
}

router.post('/', (req: Request, res: Response) => {
  const { userId, flightId, passengers, tripType, instalmentCount } = req.body;

  if (!userId || !flightId || !passengers || !Array.isArray(passengers)) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'userId, flightId, and passengers array are required',
    };
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
      error: 'BVN must be verified before making a booking',
    };
    return res.status(400).json(response);
  }

  if (user.riskCategory === 'high') {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Your account is not currently eligible for booking. Please contact support.',
    };
    return res.status(403).json(response);
  }

  const flight = flights.find((f) => f.id === flightId);
  if (!flight) {
    const response: ApiResponse<null> = { success: false, error: 'Flight not found' };
    return res.status(404).json(response);
  }

  const wallet = wallets.find((w) => w.userId === userId);
  if (!wallet) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'A wallet is required before booking. Please create your wallet first.',
    };
    return res.status(400).json(response);
  }

  const depositPercent = getDepositPercent(flight.routeType);
  const depositAmount = Math.ceil(flight.price * (depositPercent / 100));
  const maxFinancingWeeks = getMaxFinancingWeeks(flight.routeType);
  const limits = getInstalmentLimits(flight.routeType);
  const count = Math.min(Math.max(Number(instalmentCount) || limits.min, limits.min), limits.max);

  const bookingStatus = user.riskCategory === 'low' ? 'active' : 'triplock';

  const newBooking: Booking = {
    id: generateId('BK'),
    userId,
    flightId,
    flight,
    passengers,
    tripType: tripType || 'one-way',
    status: 'pending_deposit',
    totalAmount: flight.price,
    depositAmount,
    depositPaid: false,
    routeType: flight.routeType,
    maxFinancingWeeks,
    createdAt: new Date().toISOString(),
  };

  bookings.push(newBooking);

  const amountFinanced = flight.price - depositAmount;
  const instalmentAmount = Math.floor(amountFinanced / count);
  const remainder = amountFinanced - instalmentAmount * (count - 1);

  const weeklyInterval = Math.floor(maxFinancingWeeks / count);
  const now = new Date();

  const instalments: Instalment[] = Array.from({ length: count }, (_, i) => {
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + weeklyInterval * 7 * (i + 1));
    return {
      id: generateId('inst'),
      repaymentPlanId: '',
      instalmentNumber: i + 1,
      amount: i === count - 1 ? remainder : instalmentAmount,
      dueDate: dueDate.toISOString().split('T')[0],
      status: 'pending',
    };
  });

  const plan: RepaymentPlan = {
    id: generateId('rp'),
    bookingId: newBooking.id,
    userId,
    totalAmount: flight.price,
    depositAmount,
    amountFinanced,
    totalRepaid: 0,
    remainingBalance: amountFinanced,
    instalments: instalments.map((inst) => ({
      ...inst,
      repaymentPlanId: generateId('rp'),
    })),
    status: 'active',
    percentageComplete: 0,
    bookingUnlockThreshold:
      flight.routeType === 'regional'
        ? 50
        : flight.routeType === 'international'
        ? 60
        : undefined,
    createdAt: new Date().toISOString(),
  };

  repaymentPlans.push(plan);

  const response: ApiResponse<{
    booking: Booking;
    repaymentPlan: RepaymentPlan;
    nextStep: string;
  }> = {
    success: true,
    message: 'Booking created. Please complete your deposit to activate.',
    data: {
      booking: newBooking,
      repaymentPlan: plan,
      nextStep: `Please deposit ₦${depositAmount.toLocaleString()} to your Tripkopa wallet to activate this booking.`,
    },
  };
  return res.status(201).json(response);
});

router.get('/user/:userId', (req: Request, res: Response) => {
  const userBookings = bookings.filter((b) => b.userId === req.params.userId);

  const response: ApiResponse<{ bookings: Booking[]; count: number }> = {
    success: true,
    data: { bookings: userBookings, count: userBookings.length },
  };
  return res.status(200).json(response);
});

router.get('/:id', (req: Request, res: Response) => {
  const booking = bookings.find((b) => b.id === req.params.id);

  if (!booking) {
    const response: ApiResponse<null> = { success: false, error: 'Booking not found' };
    return res.status(404).json(response);
  }

  const response: ApiResponse<Booking> = { success: true, data: booking };
  return res.status(200).json(response);
});

router.post('/:id/confirm-deposit', (req: Request, res: Response) => {
  const booking = bookings.find((b) => b.id === req.params.id);

  if (!booking) {
    const response: ApiResponse<null> = { success: false, error: 'Booking not found' };
    return res.status(404).json(response);
  }

  if (booking.depositPaid) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Deposit has already been confirmed for this booking',
    };
    return res.status(400).json(response);
  }

  const { amount } = req.body;
  const paid = Number(amount);

  if (paid < booking.depositAmount) {
    const response: ApiResponse<{ shortfall: number }> = {
      success: false,
      error: `Deposit amount is insufficient. Required: ₦${booking.depositAmount.toLocaleString()}, Received: ₦${paid.toLocaleString()}`,
      data: { shortfall: booking.depositAmount - paid },
    };
    return res.status(400).json(response);
  }

  booking.depositPaid = true;

  const user = users.find((u) => u.id === booking.userId);
  booking.status = user?.riskCategory === 'low' ? 'active' : 'triplock';

  const wallet = wallets.find((w) => w.userId === booking.userId);
  if (wallet) {
    const excess = paid - booking.depositAmount;
    if (excess > 0) {
      const plan = repaymentPlans.find((p) => p.bookingId === booking.id);
      if (plan) {
        plan.totalRepaid += excess;
        plan.remainingBalance -= excess;
        plan.percentageComplete = Math.floor(
          (plan.totalRepaid / plan.amountFinanced) * 100
        );
      }
    }

    walletTransactions.push({
      id: generateId('txn'),
      walletId: wallet.id,
      type: 'deposit',
      amount: paid,
      reference: `TK-DEP-${Date.now()}`,
      description: `Deposit for booking ${booking.id}`,
      status: 'completed',
      createdAt: new Date().toISOString(),
    });
  }

  const response: ApiResponse<{ booking: Booking; message: string }> = {
    success: true,
    message:
      booking.status === 'active'
        ? 'Deposit confirmed. Your booking is now active!'
        : 'Deposit confirmed. Your booking is processing. It will be confirmed once you reach the required repayment milestone.',
    data: { booking, message: booking.status },
  };
  return res.status(200).json(response);
});

router.get('/:id/itinerary', (req: Request, res: Response) => {
  const booking = bookings.find((b) => b.id === req.params.id);

  if (!booking) {
    const response: ApiResponse<null> = { success: false, error: 'Booking not found' };
    return res.status(404).json(response);
  }

  if (!booking.depositPaid) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Itinerary is not available until deposit is confirmed',
    };
    return res.status(403).json(response);
  }

  const plan = repaymentPlans.find((p) => p.bookingId === booking.id);
  const isFullyRepaid = plan?.status === 'completed' || booking.status === 'completed';

  const partial: PartialItinerary = {
    airline: booking.flight.airline,
    flightNumber: booking.flight.flightNumber,
    departureAirport: booking.flight.departureAirport,
    arrivalAirport: booking.flight.arrivalAirport,
    departureTime: booking.flight.departureTime,
    arrivalTime: booking.flight.arrivalTime,
    date: booking.flight.date,
    passengers: booking.passengers.map((p) => ({
      fullName: p.fullName,
      dateOfBirth: p.dateOfBirth,
    })),
  };

  if (isFullyRepaid) {
    const full: FullItinerary = {
      ...partial,
      bookingReference: `TK${booking.id.replace(/\D/g, '')}REF`,
      flightReference: `${booking.flight.flightNumber}-${booking.flight.date.replace(/-/g, '')}`,
      eTicketUrl: `https://tripkopa.com/tickets/${booking.id}`,
    };

    const response: ApiResponse<{ itinerary: FullItinerary; type: string }> = {
      success: true,
      data: { itinerary: full, type: 'full' },
    };
    return res.status(200).json(response);
  }

  const response: ApiResponse<{ itinerary: PartialItinerary; type: string; note: string }> = {
    success: true,
    data: {
      itinerary: partial,
      type: 'partial',
      note: 'Your booking reference and flight reference will be shared once all repayments are complete.',
    },
  };
  return res.status(200).json(response);
});

export default router;
