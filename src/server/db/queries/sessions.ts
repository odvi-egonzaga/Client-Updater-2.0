import { db } from "../index";
import { userSessions } from "../schema/users";
import { eq, and, lt, isNull, desc } from "drizzle-orm";
import { logger } from "@/lib/logger";

/**
 * Create a new session
 */
export async function createSession(
  db: any,
  userId: string,
  sessionToken: string,
  ipAddress: string,
  userAgent: string,
  expiresAt: Date,
) {
  try {
    const result = await db
      .insert(userSessions)
      .values({
        userId,
        sessionToken,
        ipAddress,
        userAgent,
        expiresAt,
      })
      .returning();

    logger.info("Created session", {
      action: "create_session",
      userId,
      sessionId: result[0].id,
      ipAddress,
    });

    return result[0];
  } catch (error) {
    logger.error("Failed to create session", error as Error, {
      action: "create_session",
      userId,
      ipAddress,
    });
    throw error;
  }
}

/**
 * Get session by token
 */
export async function getSessionByToken(db: any, sessionToken: string) {
  try {
    const result = await db
      .select()
      .from(userSessions)
      .where(
        and(
          eq(userSessions.sessionToken, sessionToken),
          isNull(userSessions.revokedAt),
        ),
      )
      .limit(1);

    logger.debug("Retrieved session by token", {
      action: "get_session_by_token",
      sessionToken,
      found: result.length > 0,
    });

    return result[0] ?? null;
  } catch (error) {
    logger.error("Failed to get session by token", error as Error, {
      action: "get_session_by_token",
      sessionToken,
    });
    throw error;
  }
}

/**
 * Get all user sessions
 */
export async function getUserSessions(db: any, userId: string) {
  try {
    const result = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.userId, userId))
      .orderBy(desc(userSessions.createdAt));

    logger.info("Retrieved user sessions", {
      action: "get_user_sessions",
      userId,
      count: result.length,
    });

    return result;
  } catch (error) {
    logger.error("Failed to get user sessions", error as Error, {
      action: "get_user_sessions",
      userId,
    });
    throw error;
  }
}

/**
 * Revoke a single session
 */
export async function revokeSession(
  db: any,
  sessionId: string,
  reason?: string,
) {
  try {
    const result = await db
      .update(userSessions)
      .set({
        revokedAt: new Date(),
        revokedReason: reason || "Session revoked",
      })
      .where(eq(userSessions.id, sessionId))
      .returning();

    if (!result[0]) {
      return null;
    }

    logger.info("Revoked session", {
      action: "revoke_session",
      sessionId,
      reason,
    });

    return result[0];
  } catch (error) {
    logger.error("Failed to revoke session", error as Error, {
      action: "revoke_session",
      sessionId,
      reason,
    });
    throw error;
  }
}

/**
 * Revoke all user sessions
 */
export async function revokeAllUserSessions(
  db: any,
  userId: string,
  reason?: string,
) {
  try {
    const result = await db
      .update(userSessions)
      .set({
        revokedAt: new Date(),
        revokedReason: reason || "All sessions revoked",
      })
      .where(
        and(eq(userSessions.userId, userId), isNull(userSessions.revokedAt)),
      )
      .returning();

    logger.info("Revoked all user sessions", {
      action: "revoke_all_user_sessions",
      userId,
      count: result.length,
      reason,
    });

    return result;
  } catch (error) {
    logger.error("Failed to revoke all user sessions", error as Error, {
      action: "revoke_all_user_sessions",
      userId,
      reason,
    });
    throw error;
  }
}

/**
 * Remove expired sessions
 */
export async function cleanupExpiredSessions(db: any) {
  try {
    const now = new Date();
    const result = await db
      .delete(userSessions)
      .where(and(lt(userSessions.expiresAt, now)))
      .returning();

    logger.info("Cleaned up expired sessions", {
      action: "cleanup_expired_sessions",
      count: result.length,
    });

    return result;
  } catch (error) {
    logger.error("Failed to cleanup expired sessions", error as Error, {
      action: "cleanup_expired_sessions",
    });
    throw error;
  }
}
