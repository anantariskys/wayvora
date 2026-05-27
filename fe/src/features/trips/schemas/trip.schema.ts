import { z } from "zod";

export const createTripSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(2000).optional(),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
});

export type CreateTripInput = z.infer<typeof createTripSchema>;
