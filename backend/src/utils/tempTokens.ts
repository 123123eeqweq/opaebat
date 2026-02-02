/**
 * 🔥 FLOW S3: Temporary token storage for 2FA login
 * Simple in-memory storage with TTL
 */

interface TempTokenData {
  userId: string;
  expiresAt: number;
}

const tempTokens = new Map<string, TempTokenData>();

// Cleanup expired tokens every minute
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of tempTokens.entries()) {
    if (data.expiresAt < now) {
      tempTokens.delete(token);
    }
  }
}, 60 * 1000);

/**
 * Generate temporary token for 2FA login
 * Valid for 5 minutes
 */
export function generateTempToken(userId: string): string {
  const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

  tempTokens.set(token, {
    userId,
    expiresAt,
  });

  return token;
}

/**
 * Verify temporary token and extract userId
 */
export function verifyTempToken(token: string): string | null {
  const data = tempTokens.get(token);
  if (!data) {
    return null;
  }

  // Check expiration
  if (data.expiresAt < Date.now()) {
    tempTokens.delete(token);
    return null;
  }

  // Delete token after use (one-time use)
  tempTokens.delete(token);

  return data.userId;
}
