import { z } from "zod";

export const sensorReadingSchema = z.object({
  // temperature: z.coerce.number(),
  light_intensity: z.coerce.number(),
  ph_level: z.coerce.number(),
  turbidity: z.coerce.number(),
  // dissolved_oxygen: z.coerce.number(),
  timestamp: z.coerce.date().optional(),
});

export type SensorReading = z.infer<typeof sensorReadingSchema>;
