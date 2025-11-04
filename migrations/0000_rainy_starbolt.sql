CREATE TABLE "readings" (
	"id" serial PRIMARY KEY NOT NULL,
	"temperature" real NOT NULL,
	"light_intensity" real NOT NULL,
	"ph_level" real NOT NULL,
	"turbidity" real NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
