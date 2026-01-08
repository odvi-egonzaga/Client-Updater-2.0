import { z } from "zod";

const envSchema = z.object({
  // App
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),

  // Clerk
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z
    .string()
    .startsWith("pk_")
    .default("pk_test_placeholder"),
  CLERK_SECRET_KEY: z.string().startsWith("sk_").default("sk_test_placeholder"),
  CLERK_WEBHOOK_SECRET: z.string().optional(),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url()
    .default("https://placeholder.supabase.co"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().default("placeholder"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().default("placeholder"),
  DATABASE_URL: z
    .string()
    .default("postgresql://postgres:password@localhost:5432/postgres"),

  // Snowflake
  SNOWFLAKE_ACCOUNT: z.string().default("placeholder"),
  SNOWFLAKE_USERNAME: z.string().default("placeholder"),
  SNOWFLAKE_AUTHENTICATOR: z.literal("SNOWFLAKE_JWT").default("SNOWFLAKE_JWT"),
  SNOWFLAKE_PRIVATE_KEY: z.string().default("placeholder"),
  SNOWFLAKE_PRIVATE_KEY_PASSPHRASE: z.string().optional(),
  SNOWFLAKE_WAREHOUSE: z.string().default("COMPUTE_WH"),
  SNOWFLAKE_ROLE: z.string().default("ACCOUNTADMIN"),
  SNOWFLAKE_LOGGING: z
    .string()
    .transform((val) => val === "true")
    .optional(),

  // NextBank (optional)
  NEXTBANK_API: z.string().url().optional(),
  NEXTBANK_API_USERNAME: z.string().optional(),
  NEXTBANK_API_PASSWORD: z.string().optional(),

  // AWS S3 (optional)
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_ACCESS_SECRET_KEY: z.string().optional(),
  AWS_REGION: z.string().optional(),

  // Upstash Redis (optional)
  UPSTASH_REDIS_URL: z.string().url().optional(),
  UPSTASH_REDIS_TOKEN: z.string().optional(),

  // Rate limiting
  RATE_LIMIT_READ_REQUESTS: z.coerce.number().default(100),
  RATE_LIMIT_WRITE_REQUESTS: z.coerce.number().default(50),
  RATE_LIMIT_EXPORT_REQUESTS: z.coerce.number().default(10),
  RATE_LIMIT_LOGIN_ATTEMPTS: z.coerce.number().default(5),

  // Circuit breakers
  CIRCUIT_SNOWFLAKE_THRESHOLD: z.coerce.number().default(5),
  CIRCUIT_SNOWFLAKE_COOLDOWN_MS: z.coerce.number().default(60000),
  CIRCUIT_NEXTBANK_THRESHOLD: z.coerce.number().default(5),
  CIRCUIT_NEXTBANK_COOLDOWN_MS: z.coerce.number().default(60000),

  // Synology (optional)
  SYNOLOGY_HOST: z.string().url().optional(),
  SYNOLOGY_USERNAME: z.string().optional(),
  SYNOLOGY_PASSWORD: z.string().optional(),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
