import { Hono } from "hono";
import { writeTestRow, readTestRow, deleteTestRow } from "@/lib/health";

export const databaseHealthRoutes = new Hono();

databaseHealthRoutes.post("/write", async (c) => {
  const result = await writeTestRow();
  return c.json(result);
});

databaseHealthRoutes.get("/read", async (c) => {
  const result = await readTestRow();
  return c.json(result);
});

databaseHealthRoutes.delete("/delete", async (c) => {
  const result = await deleteTestRow();
  return c.json(result);
});
