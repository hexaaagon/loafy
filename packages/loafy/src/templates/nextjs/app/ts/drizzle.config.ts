import type { Config } from "drizzle-kit";

export default {
  schema: "./src/lib/database/schema",
  dialect: "postgresql",
  out: "./src/lib/database/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
