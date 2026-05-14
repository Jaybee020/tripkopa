import { Router, Request, Response } from "express";
import {
  repaymentPlans,
  bookings,
  wallets,
  walletTransactions,
  generateId,
} from "../data/mockData";
import {
  ApiResponse,
  RepaymentPlan,
  RepaymentSummary,
  Instalment,
} from "../types";

const router = Router();

router.get("/booking/:bookingId", (req: Request, res: Response) => {
  const plan = repaymentPlans[0];

  if (!plan) {
    const response: ApiResponse<null> = {
      success: false,
      error: "Repayment plan not found for this booking",
    };
    return res.status(404).json(response);
  }

  const response: ApiResponse<RepaymentPlan> = { success: true, data: plan };
  return res.status(200).json(response);
});

router.get("/booking/:bookingId/summary", (req: Request, res: Response) => {
  const plan = repaymentPlans[0];

  if (!plan) {
    const response: ApiResponse<null> = {
      success: false,
      error: "Repayment plan not found for this booking",
    };
    return res.status(404).json(response);
  }

  const paidInstalments = plan.instalments.filter((i) => i.status === "paid");
  const upcomingPayments = plan.instalments
    .filter((i) => i.status === "pending" || i.status === "overdue")
    .sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    );

  const nextPayment = upcomingPayments[0]
    ? {
        instalmentId: upcomingPayments[0].id,
        amount: upcomingPayments[0].amount,
        dueDate: upcomingPayments[0].dueDate,
      }
    : undefined;

  const summary: RepaymentSummary = {
    repaymentPlanId: plan.id,
    bookingId: plan.bookingId,
    status: plan.status,
    totalAmount: plan.totalAmount,
    depositAmount: plan.depositAmount,
    amountFinanced: plan.amountFinanced,
    totalRepaid: plan.totalRepaid,
    remainingBalance: plan.remainingBalance,
    percentageComplete: plan.percentageComplete,
    nextPayment,
    upcomingPayments,
    paidInstalments,
  };

  const response: ApiResponse<RepaymentSummary> = {
    success: true,
    data: summary,
  };
  return res.status(200).json(response);
});

router.post("/instalments/:instalmentId/pay", (req: Request, res: Response) => {
  let targetInstalment: Instalment | undefined;
  let targetPlan: RepaymentPlan | undefined;

  for (const plan of repaymentPlans) {
    const inst = plan.instalments.find((i) => i.id === req.params.instalmentId);
    if (inst) {
      targetInstalment = inst;
      targetPlan = plan;
      break;
    }
  }

  if (!targetInstalment || !targetPlan) {
    const response: ApiResponse<null> = {
      success: false,
      error: "Instalment not found",
    };
    return res.status(404).json(response);
  }

  if (targetInstalment.status === "paid") {
    const response: ApiResponse<null> = {
      success: false,
      error: "This instalment has already been paid",
    };
    return res.status(400).json(response);
  }

  const { amount } = req.body;
  const paid = Number(amount);

  if (paid < targetInstalment.amount) {
    const response: ApiResponse<{ shortfall: number }> = {
      success: false,
      error: `Insufficient amount. Required: ₦${targetInstalment.amount.toLocaleString()}, Received: ₦${paid.toLocaleString()}`,
      data: { shortfall: targetInstalment.amount - paid },
    };
    return res.status(400).json(response);
  }

  targetInstalment.status = "paid";
  targetInstalment.paidAt = new Date().toISOString();

  const excess = paid - targetInstalment.amount;
  targetPlan.totalRepaid += targetInstalment.amount;
  targetPlan.remainingBalance -= targetInstalment.amount;
  targetPlan.percentageComplete = Math.floor(
    (targetPlan.totalRepaid / targetPlan.amountFinanced) * 100,
  );

  if (excess > 0) {
    const nextPending = targetPlan.instalments.find(
      (i) => i.status === "pending",
    );
    if (nextPending) {
      nextPending.amount = Math.max(0, nextPending.amount - excess);
    }
  }

  const allPaid = targetPlan.instalments.every((i) => i.status === "paid");
  if (allPaid) {
    targetPlan.status = "completed";
    targetPlan.percentageComplete = 100;
    targetPlan.remainingBalance = 0;

    const booking = bookings.find((b) => b.id === targetPlan!.bookingId);
    if (booking) booking.status = "completed";
  }

  const wallet = wallets.find((w) => w.userId === targetPlan!.userId);
  if (wallet) {
    walletTransactions.push({
      id: generateId("txn"),
      walletId: wallet.id,
      type: "repayment",
      amount: paid,
      reference: `TK-REP-${Date.now()}`,
      description: `Instalment ${targetInstalment.instalmentNumber} for booking ${targetPlan.bookingId}`,
      status: "completed",
      createdAt: new Date().toISOString(),
    });
  }

  const bookingForTriplock = bookings.find(
    (b) => b.id === targetPlan!.bookingId,
  );
  const unlockMessage =
    bookingForTriplock?.status === "triplock" &&
    targetPlan.bookingUnlockThreshold &&
    targetPlan.percentageComplete >= targetPlan.bookingUnlockThreshold
      ? "Milestone reached! Your booking is being confirmed."
      : undefined;

  if (unlockMessage && bookingForTriplock) {
    bookingForTriplock.status = "active";
  }

  const response: ApiResponse<{
    instalment: Instalment;
    plan: RepaymentPlan;
    message?: string;
  }> = {
    success: true,
    message: unlockMessage || "Payment recorded successfully",
    data: {
      instalment: targetInstalment,
      plan: targetPlan,
      message: unlockMessage,
    },
  };
  return res.status(200).json(response);
});

router.get("/reminders/:userId", (req: Request, res: Response) => {
  const userPlans = repaymentPlans.filter((p) => p.status === "active");

  const today = new Date();
  const in48h = new Date(today.getTime() + 48 * 60 * 60 * 1000);

  const upcoming: Array<{
    bookingId: string;
    instalment: Instalment;
    hoursUntilDue: number;
  }> = [];

  for (const plan of userPlans) {
    for (const inst of plan.instalments) {
      if (inst.status !== "pending") continue;
      const due = new Date(inst.dueDate);
      const hoursUntilDue = Math.floor(
        (due.getTime() - today.getTime()) / (1000 * 60 * 60),
      );

      if (hoursUntilDue <= 48) {
        upcoming.push({
          bookingId: plan.bookingId,
          instalment: inst,
          hoursUntilDue,
        });
      }
    }
  }

  upcoming.sort((a, b) => a.hoursUntilDue - b.hoursUntilDue);

  const response: ApiResponse<{
    reminders: typeof upcoming;
    count: number;
  }> = {
    success: true,
    data: { reminders: upcoming, count: upcoming.length },
  };
  return res.status(200).json(response);
});

export default router;
