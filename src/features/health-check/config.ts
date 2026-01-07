// Health check service configuration placeholder
export const SERVICES = [
  {
    name: "Clerk Authentication",
    icon: "key",
    checks: [
      { name: "Environment Config", endpoint: "/clerk/env" },
      { name: "API Connectivity", endpoint: "/clerk/api-status" },
      { name: "Get Current User", endpoint: "/clerk/user" },
      { name: "Get Org Membership", endpoint: "/clerk/org" },
      { name: "List Org Members", endpoint: "/clerk/members" },
    ],
  },
  {
    name: "Supabase Database",
    icon: "database",
    checks: [
      { name: "Write Test Row", endpoint: "/database/write" },
      { name: "Read Test Row", endpoint: "/database/read" },
      { name: "Delete Test Row", endpoint: "/database/delete" },
    ],
  },
  {
    name: "Supabase Storage",
    icon: "folder",
    checks: [
      { name: "Upload Test File", endpoint: "/storage/upload" },
      { name: "Download Test File", endpoint: "/storage/download" },
      { name: "Delete Test File", endpoint: "/storage/delete" },
    ],
  },
  {
    name: "Supabase Edge Functions",
    icon: "zap",
    checks: [
      { name: "Ping Edge Function", endpoint: "/edge/ping" },
      { name: "Test Auth Header", endpoint: "/edge/auth" },
    ],
  },
  {
    name: "Snowflake",
    icon: "snowflake",
    checks: [
      { name: "Test Connection", endpoint: "/snowflake/connect" },
      { name: "Execute Query", endpoint: "/snowflake/query" },
    ],
  },
  {
    name: "NextBank",
    icon: "building",
    checks: [{ name: "Ping API", endpoint: "/nextbank/ping" }],
  },
  {
    name: "Synology",
    icon: "server",
    checks: [
      { name: "Ping Host", endpoint: "/synology/ping" },
      { name: "Authentication", endpoint: "/synology/auth" },
    ],
  },
  {
    name: "AWS S3",
    icon: "cloud",
    checks: [{ name: "Connect", endpoint: "/aws-s3/connect" }],
  },
  {
    name: "Framework",
    icon: "code",
    checks: [
      { name: "Hono API", endpoint: "/framework/hono" },
      { name: "Drizzle ORM", endpoint: "/framework/drizzle" },
    ],
  },
  {
    name: "Client State",
    icon: "cpu",
    checks: [
      { name: "Zustand Store", endpoint: "client:zustand" },
      { name: "TanStack Query", endpoint: "client:query" },
    ],
  },
] as const;
