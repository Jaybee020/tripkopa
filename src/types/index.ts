export type RiskCategory = 'low' | 'medium' | 'high';
export type RouteType = 'domestic' | 'regional' | 'international';
export type TicketClass = 'economy' | 'business' | 'first';
export type TripType = 'one-way' | 'return';
export type BookingStatus =
  | 'pending_deposit'
  | 'deposit_received'
  | 'active'
  | 'triplock'
  | 'completed'
  | 'cancelled';
export type InstalmentStatus = 'pending' | 'paid' | 'overdue';
export type RepaymentPlanStatus = 'active' | 'completed' | 'defaulted';
export type TransactionType = 'deposit' | 'repayment' | 'top_up';
export type TransactionStatus = 'pending' | 'completed' | 'failed';

export interface User {
  id: string;
  fullName: string;
  dateOfBirth: string;
  phoneNumber: string;
  email: string;
  bvnVerified: boolean;
  riskCategory: RiskCategory;
  createdAt: string;
}

export interface Wallet {
  id: string;
  userId: string;
  accountNumber: string;
  bankName: string;
  balance: number;
  currency: 'NGN';
  createdAt: string;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  type: TransactionType;
  amount: number;
  reference: string;
  description: string;
  status: TransactionStatus;
  createdAt: string;
}

export interface Flight {
  id: string;
  airline: string;
  flightNumber: string;
  departureAirport: string;
  departureCode: string;
  arrivalAirport: string;
  arrivalCode: string;
  departureTime: string;
  arrivalTime: string;
  date: string;
  price: number;
  stops: number;
  travelDuration: string;
  class: TicketClass;
  routeType: RouteType;
  refundable: boolean;
  seatsAvailable: number;
}

export interface Passenger {
  fullName: string;
  dateOfBirth: string;
  email: string;
  phoneNumber: string;
  passportNumber?: string;
}

export interface Booking {
  id: string;
  userId: string;
  flightId: string;
  flight: Flight;
  passengers: Passenger[];
  tripType: TripType;
  status: BookingStatus;
  totalAmount: number;
  depositAmount: number;
  depositPaid: boolean;
  routeType: RouteType;
  maxFinancingWeeks: number;
  createdAt: string;
}

export interface PartialItinerary {
  airline: string;
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string;
  arrivalTime: string;
  date: string;
  passengers: Array<{ fullName: string; dateOfBirth: string }>;
}

export interface FullItinerary extends PartialItinerary {
  bookingReference: string;
  flightReference: string;
  eTicketUrl: string;
}

export interface Instalment {
  id: string;
  repaymentPlanId: string;
  instalmentNumber: number;
  amount: number;
  dueDate: string;
  status: InstalmentStatus;
  paidAt?: string;
}

export interface RepaymentPlan {
  id: string;
  bookingId: string;
  userId: string;
  totalAmount: number;
  depositAmount: number;
  amountFinanced: number;
  totalRepaid: number;
  remainingBalance: number;
  instalments: Instalment[];
  status: RepaymentPlanStatus;
  percentageComplete: number;
  bookingUnlockThreshold?: number;
  createdAt: string;
}

export interface RepaymentSummary {
  repaymentPlanId: string;
  bookingId: string;
  status: RepaymentPlanStatus;
  totalAmount: number;
  depositAmount: number;
  amountFinanced: number;
  totalRepaid: number;
  remainingBalance: number;
  percentageComplete: number;
  nextPayment?: {
    instalmentId: string;
    amount: number;
    dueDate: string;
  };
  upcomingPayments: Instalment[];
  paidInstalments: Instalment[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
