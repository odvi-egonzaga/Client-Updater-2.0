import { Hono } from "hono";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { env } from "@/config/env";

const BUCKET_NAME = "health-check-bucket";
const TEST_FILE_PATH = "health-check/test-file.txt";

export const storageHealthRoutes = new Hono();

storageHealthRoutes.post("/upload", async (c) => {
  const start = performance.now();

  try {
    // Ensure bucket exists
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.name === BUCKET_NAME);

    if (!bucketExists) {
      // Create bucket if it doesn't exist
      const { error: createError } = await supabaseAdmin.storage.createBucket(
        BUCKET_NAME,
        {
          public: false,
        },
      );
      if (createError) throw createError;
    }

    // Upload test file
    const testContent = `Health check test file - ${new Date().toISOString()}`;
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(TEST_FILE_PATH, new Blob([testContent], { type: "text/plain" }), {
        upsert: true,
      });

    if (error) throw error;

    return c.json({
      status: "healthy",
      responseTimeMs: Math.round(performance.now() - start),
      message: "Successfully uploaded test file to storage",
      data: {
        path: data?.path,
        bucket: BUCKET_NAME,
      },
    });
  } catch (error) {
    return c.json(
      {
        status: "error",
        responseTimeMs: Math.round(performance.now() - start),
        error:
          error instanceof Error
            ? error.message
            : "Failed to upload to storage",
      },
      500,
    );
  }
});

storageHealthRoutes.get("/download", async (c) => {
  const start = performance.now();

  try {
    // Check if file exists
    const { data: fileData, error: checkError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .list("health-check", {
        limit: 10,
      });

    if (checkError) throw checkError;

    const testFile = fileData?.find((f) => f.name === "test-file.txt");

    if (!testFile) {
      return c.json({
        status: "healthy",
        responseTimeMs: Math.round(performance.now() - start),
        message: "Storage connection successful, but no test file found",
        data: { found: false },
      });
    }

    // Get signed URL for download
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .createSignedUrl(TEST_FILE_PATH, 60);

    // Handle "Object not found" as a success state for health check
    // since connectivity is working, but the file just isn't there
    if (error && error.message.includes("Object not found")) {
      return c.json({
        status: "healthy",
        responseTimeMs: Math.round(performance.now() - start),
        message:
          "Storage connection successful, but no test file found to download",
        data: {
          found: false,
          path: TEST_FILE_PATH,
        },
      });
    }

    if (error) throw error;

    return c.json({
      status: "healthy",
      responseTimeMs: Math.round(performance.now() - start),
      message: "Successfully generated download URL for test file",
      data: {
        found: true,
        signedUrl: data?.signedUrl,
        path: TEST_FILE_PATH,
      },
    });
  } catch (error) {
    return c.json(
      {
        status: "error",
        responseTimeMs: Math.round(performance.now() - start),
        error:
          error instanceof Error
            ? error.message
            : "Failed to download from storage",
      },
      500,
    );
  }
});

storageHealthRoutes.delete("/delete", async (c) => {
  const start = performance.now();

  try {
    // Check if file exists first
    const { data: fileData, error: checkError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .list("health-check", {
        limit: 10,
      });

    if (checkError) throw checkError;

    const testFile = fileData?.find((f) => f.name === "test-file.txt");

    if (!testFile) {
      return c.json({
        status: "healthy",
        responseTimeMs: Math.round(performance.now() - start),
        message: "Storage connection successful, but no test file to delete",
        data: { deleted: false },
      });
    }

    // Delete test file
    const { error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .remove([TEST_FILE_PATH]);

    if (error) throw error;

    return c.json({
      status: "healthy",
      responseTimeMs: Math.round(performance.now() - start),
      message: "Successfully deleted test file from storage",
      data: {
        deleted: true,
        path: TEST_FILE_PATH,
      },
    });
  } catch (error) {
    return c.json(
      {
        status: "error",
        responseTimeMs: Math.round(performance.now() - start),
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete from storage",
      },
      500,
    );
  }
});
