import "dotenv/config";
// Config reloaded

export const config = {
  // Telegram
  botToken: process.env.TELEGRAM_BOT_TOKEN || "",

  // MongoDB
  mongoUri: process.env.MONGODB_URI || "",

  // Webapp
  webappUrl: process.env.WEBAPP_URL || "http://localhost:5173",

  // Openfort Server API
  openfortApiKey: process.env.OPENFORT_API_KEY || "",
  openfortPolicyId: process.env.OPENFORT_POLICY_ID || "",

  // Blockchain
  usdcContractAddress: process.env.USDC_CONTRACT_ADDRESS || "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  baseRpcUrl: process.env.BASE_RPC_URL || "https://sepolia.base.org",

  // Environment
  isDev: process.env.NODE_ENV !== "production",
};

// Validate required config
export function validateConfig() {
  if (!config.botToken) {
    throw new Error("TELEGRAM_BOT_TOKEN is required");
  }
  if (!config.mongoUri) {
    throw new Error("MONGODB_URI is required");
  }
  if (!config.openfortApiKey) {
    throw new Error("OPENFORT_API_KEY is required - get it from Openfort Dashboard");
  }
  if (!config.openfortPolicyId) {
    console.warn("⚠️ OPENFORT_POLICY_ID not set - gas sponsorship may not work");
  }
}
