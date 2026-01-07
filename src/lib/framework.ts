import { clerkClient } from "@clerk/nextjs/server";
import { supabaseAdmin } from "./supabase/admin";
import { nextbankClient } from "./nextbank/client";
import { synologyClient } from "./synology/client";
import { snowflakeClient } from "./snowflake/client";
import { s3Client } from "./aws-s3/client";

export class Framework {
  /**
   * Clerk Authentication SDK
   * Use this to manage users, sessions, and organizations.
   */
  public clerk = clerkClient;

  /**
   * Supabase Admin Client (Service Role)
   * Use this for database and storage operations with full privileges.
   */
  public supabase = supabaseAdmin;

  /**
   * Snowflake Client
   * Use this to execute SQL queries against your Snowflake data warehouse.
   */
  public snowflake = snowflakeClient;

  /**
   * AWS S3 Client
   * Use this to manage files in AWS S3 buckets.
   */
  public s3 = s3Client;

  /**
   * NextBank Integration
   * Use this to interact with the NextBank API.
   */
  public nextbank = nextbankClient;

  /**
   * Synology Integration
   * Use this to manage files on a Synology NAS.
   */
  public synology = synologyClient;
}

export const framework = new Framework();
