// Follow this setup guide to deploy the function:
// https://supabase.com/docs/guides/functions/deploy

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();
    let authHeader = req.headers.get("Authorization");
    const testAuthHeader = req.headers.get("x-test-auth");

    // Handle ping check
    if (message === "ping") {
      return new Response(
        JSON.stringify({
          message: "pong",
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // Handle auth check
    if (message === "auth-check") {
      // Prioritize test header if present (allows testing without bypassing Supabase Gateway auth)
      if (testAuthHeader) {
        authHeader = testAuthHeader;
      }

      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: "No authorization header provided" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 401,
          },
        );
      }

      return new Response(
        JSON.stringify({
          message: "Auth header received",
          hasAuth: true,
          // Don't log/return the full token in production for security
          tokenPrefix: authHeader.substring(0, 10) + "...",
          source: testAuthHeader ? "x-test-auth" : "Authorization",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    return new Response(JSON.stringify({ error: "Unknown message type" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
