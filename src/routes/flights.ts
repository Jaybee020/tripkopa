import { Router, Request, Response } from 'express';
import { flights } from '../data/mockData';
import { ApiResponse, Flight, RouteType } from '../types';

const router = Router();

function getRouteType(from: string, to: string): RouteType {
  const nigerianCodes = ['LOS', 'ABV', 'PHC', 'KAN', 'ENE', 'QOW', 'IBA', 'SKO'];
  const africanCodes = ['KGL', 'NBO', 'ACC', 'ABJ', 'DKR', 'CPT', 'JNB', 'CMN', 'ADD'];

  const fromUpper = from.toUpperCase();
  const toUpper = to.toUpperCase();

  if (nigerianCodes.includes(fromUpper) && nigerianCodes.includes(toUpper)) return 'domestic';
  if (africanCodes.includes(toUpper) || africanCodes.includes(fromUpper)) return 'regional';
  return 'international';
}

router.get('/search', (req: Request, res: Response) => {
  const { from, to, date, class: ticketClass, tripType, passengers } = req.query;

  if (!from || !to || !date) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'from, to, and date query parameters are required',
    };
    return res.status(400).json(response);
  }

  let results = flights.filter(
    (f) =>
      f.departureCode.toLowerCase() === String(from).toLowerCase() &&
      f.arrivalCode.toLowerCase() === String(to).toLowerCase()
  );

  if (ticketClass) {
    results = results.filter((f) => f.class === ticketClass);
  }

  results.sort((a, b) => a.price - b.price);

  const routeType = getRouteType(String(from), String(to));

  const maxFinancingWeeks =
    routeType === 'domestic' ? 12 : routeType === 'regional' ? 16 : 24;

  const depositPercent =
    routeType === 'domestic' ? 30 : routeType === 'regional' ? 40 : 50;

  const response: ApiResponse<{
    flights: Flight[];
    count: number;
    searchParams: object;
    financingInfo: object;
  }> = {
    success: true,
    data: {
      flights: results,
      count: results.length,
      searchParams: {
        from,
        to,
        date,
        class: ticketClass || 'economy',
        tripType: tripType || 'one-way',
        passengers: Number(passengers) || 1,
        routeType,
      },
      financingInfo: {
        routeType,
        maxFinancingWeeks,
        depositPercent,
        note: `Displayed prices include Tripkopa financing charges. A ${depositPercent}% deposit is required.`,
      },
    },
  };
  return res.status(200).json(response);
});

router.get('/:id', (req: Request, res: Response) => {
  const flight = flights.find((f) => f.id === req.params.id);

  if (!flight) {
    const response: ApiResponse<null> = { success: false, error: 'Flight not found' };
    return res.status(404).json(response);
  }

  const depositPercent =
    flight.routeType === 'domestic' ? 30 : flight.routeType === 'regional' ? 40 : 50;

  const maxFinancingWeeks =
    flight.routeType === 'domestic' ? 12 : flight.routeType === 'regional' ? 16 : 24;

  const response: ApiResponse<Flight & { financingInfo: object }> = {
    success: true,
    data: {
      ...flight,
      financingInfo: {
        depositRequired: Math.ceil(flight.price * (depositPercent / 100)),
        depositPercent,
        maxFinancingWeeks,
      },
    },
  };
  return res.status(200).json(response);
});

export default router;
