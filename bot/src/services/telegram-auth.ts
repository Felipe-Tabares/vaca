import crypto from "crypto";
import { config } from "../config/index.js";

/**
 * Validate Telegram Mini App initData
 * @see https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateTelegramInitData(initData: string): {
  valid: boolean;
  data?: Record<string, string>;
  user?: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
  };
} {
  try {
    if (!initData) {
      return { valid: false };
    }

    // Parse the initData string
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get("hash");

    if (!hash) {
      return { valid: false };
    }

    // Remove hash from data for validation
    urlParams.delete("hash");

    // Sort parameters alphabetically and create data-check-string
    const dataCheckArray: string[] = [];
    const sortedKeys = Array.from(urlParams.keys()).sort();

    for (const key of sortedKeys) {
      dataCheckArray.push(`${key}=${urlParams.get(key)}`);
    }

    const dataCheckString = dataCheckArray.join("\n");

    // Create secret key: HMAC-SHA256 of bot token with "WebAppData" as key
    const secretKey = crypto
      .createHmac("sha256", "WebAppData")
      .update(config.botToken)
      .digest();

    // Calculate hash
    const calculatedHash = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    // Compare hashes
    if (calculatedHash !== hash) {
      console.log("Invalid Telegram initData hash");
      return { valid: false };
    }

    // Check auth_date is not too old (allow 24 hours)
    const authDate = urlParams.get("auth_date");
    if (authDate) {
      const authTimestamp = parseInt(authDate) * 1000;
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      if (now - authTimestamp > maxAge) {
        console.log("Telegram initData expired");
        return { valid: false };
      }
    }

    // Parse user data
    const userData = urlParams.get("user");
    let user;
    if (userData) {
      try {
        user = JSON.parse(userData);
      } catch {
        // User data not parseable
      }
    }

    // Convert to object
    const data: Record<string, string> = {};
    for (const [key, value] of urlParams.entries()) {
      data[key] = value;
    }

    return { valid: true, data, user };
  } catch (error) {
    console.error("Error validating Telegram initData:", error);
    return { valid: false };
  }
}

/**
 * Validate that a telegramId matches the authenticated user
 */
export function validateTelegramUser(
  initData: string,
  expectedTelegramId: number
): boolean {
  const result = validateTelegramInitData(initData);

  if (!result.valid || !result.user) {
    return false;
  }

  return result.user.id === expectedTelegramId;
}

/**
 * Validate Ethereum address format
 */
export function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate MongoDB ObjectId format
 */
export function isValidObjectId(id: string): boolean {
  return /^[a-f\d]{24}$/i.test(id);
}
