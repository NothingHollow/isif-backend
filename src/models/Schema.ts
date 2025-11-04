import { pgTable, serial, integer, timestamp, real } from "drizzle-orm/pg-core";

export const readingsTable = pgTable("readings", {
  id: serial("id").primaryKey(), // auto-incrementing ID
  // temperature: real("temperature").notNull(), // °C
  light_intensity: real("light_intensity").notNull(), // lux or %
  ph_level: real("ph_level").notNull(), // 0–14 scale
  turbidity: real("turbidity").notNull(), // NTU (Nephelometric Turbidity Units)
  // dissolved_oxygen: real("dissolved_oxygen").notNull(), // mg/L

  timestamp: timestamp("timestamp").defaultNow().notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});
