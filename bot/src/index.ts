import { Bot } from "grammy";
import mongoose from "mongoose";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { config, validateConfig } from "./config/index.js";
import {
  handleStart,
  handleHelp,
  handleBalance,
  handleCrear,
  handleUnirse,
  handleAportar,
  handleEstado,
  handleRetirar,
  handleMis,
  handleCancelar,
} from "./commands/index.js";
import {
  validateTelegramInitData,
  isValidEthereumAddress,
  isValidObjectId,
  verifyTransaction,
  getUSDCBalance,
  createWithdrawalIntent,
} from "./services/index.js";
import { User, Vaquita, Contribution } from "./models/index.js";
import { formatUSDC, escapeMarkdown } from "./utils/index.js";
import { Context } from "grammy";

// HTTP API Server for webapp communication
const app = express();

// =============================================================================
// SECURITY: Rate Limiting
// =============================================================================
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 requests per minute for sensitive endpoints
  message: { error: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

// =============================================================================
// SECURITY: CORS Configuration
// =============================================================================
const allowedOrigins = [
  config.webappUrl,
  "https://telegram.org",
  "https://web.telegram.org",
];

// In development, allow localhost
if (config.isDev) {
  allowedOrigins.push("http://localhost:3847");
  allowedOrigins.push("http://localhost:5173");
  allowedOrigins.push("http://127.0.0.1:3847");
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);

      // Check if origin is allowed
      if (allowedOrigins.some((allowed) => origin.startsWith(allowed) || origin.includes("ngrok"))) {
        return callback(null, true);
      }

      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "10kb" })); // Limit body size
app.use(apiLimiter); // Apply rate limiting globally

const API_PORT = process.env.API_PORT || 3001;

// =============================================================================
// MAIN FUNCTION
// =============================================================================
async function main() {
  // Validate config
  validateConfig();

  // Connect to MongoDB
  console.log("📦 Connecting to MongoDB...");
  await mongoose.connect(config.mongoUri);
  console.log("✅ MongoDB connected");

  // Create bot instance
  const bot = new Bot(config.botToken);

  // Register commands
  bot.command("start", handleStart);
  bot.command("help", handleHelp);
  bot.command("balance", handleBalance);
  bot.command("crear", handleCrear);
  bot.command("unirse", handleUnirse);
  bot.command("aportar", handleAportar);
  bot.command("estado", handleEstado);
  bot.command("retirar", handleRetirar);
  bot.command("mis", handleMis);
  bot.command("cancelar", handleCancelar);

  // Handle unknown commands
  bot.on("message:text", async (ctx) => {
    const text = ctx.message.text;
    if (text.startsWith("/")) {
      await ctx.reply(
        "❓ Comando no reconocido.\n\nUsa /help para ver los comandos disponibles."
      );
    }
  });

  // Handle webapp data (when Mini App sends data back)
  bot.on("message:web_app_data", async (ctx) => {
    try {
      const data = JSON.parse(ctx.message.web_app_data.data);
      console.log("Received webapp data:", data);

      // Handle different types of webapp responses
      switch (data.type) {
        case "wallet_connected":
          await handleWalletConnected(ctx, data);
          break;
        case "contribution_confirmed":
          await handleContributionConfirmed(ctx, data);
          break;
        case "withdrawal_confirmed":
          await handleWithdrawalConfirmed(ctx, data);
          break;
        default:
          console.log("Unknown webapp data type:", data.type);
      }
    } catch (error) {
      console.error("Error processing webapp data:", error);
    }
  });

  // Error handling
  bot.catch((err) => {
    console.error("Bot error:", err);
  });

  // =============================================================================
  // HTTP API ENDPOINTS (with security)
  // =============================================================================

  // Health check (public)
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", bot: "running" });
  });

  // =============================================================================
  // SECURE: Connect wallet endpoint
  // Validates Telegram initData before accepting wallet connection
  // =============================================================================
  app.post("/api/connect-wallet", strictLimiter, async (req: Request, res: Response) => {
    try {
      const { telegramId, walletAddress, openfortUserId, initData } = req.body;

      // Validate required fields
      if (!telegramId || !walletAddress) {
        return res.status(400).json({ error: "Missing telegramId or walletAddress" });
      }

      // SECURITY: Validate wallet address format
      if (!isValidEthereumAddress(walletAddress)) {
        return res.status(400).json({ error: "Invalid wallet address format" });
      }

      // SECURITY: Validate Telegram initData (if provided)
      // In production, this should be required
      if (initData) {
        const validation = validateTelegramInitData(initData);
        if (!validation.valid) {
          console.warn(`Invalid initData for telegramId ${telegramId}`);
          return res.status(401).json({ error: "Invalid authentication" });
        }

        // Verify the telegramId matches the authenticated user
        if (validation.user && validation.user.id !== Number(telegramId)) {
          console.warn(`TelegramId mismatch: expected ${validation.user.id}, got ${telegramId}`);
          return res.status(401).json({ error: "User ID mismatch" });
        }
      } else if (!config.isDev) {
        // In production, require initData
        return res.status(401).json({ error: "Authentication required" });
      }

      console.log(`📱 API: Connecting wallet for user ${telegramId}: ${walletAddress}, openfortUserId: ${openfortUserId}`);

      // Update user in database - save openfortUserId for future Openfort authentication
      const user = await User.findOneAndUpdate(
        { telegramId: Number(telegramId) },
        {
          walletAddress,
          openfortUserId: openfortUserId ? Number(openfortUserId) : Number(telegramId)
        },
        { new: true }
      );

      if (!user) {
        // Create user if doesn't exist
        await User.create({
          telegramId: Number(telegramId),
          walletAddress,
          openfortUserId: openfortUserId ? Number(openfortUserId) : Number(telegramId),
        });
        console.log(`✅ API: Created new user with wallet`);
      } else {
        console.log(`✅ API: Updated user wallet`);
      }

      res.json({ success: true, walletAddress });
    } catch (error) {
      console.error("API Error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // =============================================================================
  // SECURE: Get USDC Balance
  // =============================================================================
  app.get("/api/balance/:walletAddress", async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.params;

      if (!isValidEthereumAddress(walletAddress)) {
        return res.status(400).json({ error: "Invalid wallet address" });
      }

      const balance = await getUSDCBalance(walletAddress);

      res.json({ balance, currency: "USDC" });
    } catch (error) {
      console.error("Balance API Error:", error);
      res.status(500).json({ error: "Failed to fetch balance" });
    }
  });

  // =============================================================================
  // SECURE: Confirm Contribution (with on-chain verification)
  // =============================================================================
  app.post("/api/confirm-contribution", strictLimiter, async (req: Request, res: Response) => {
    try {
      const { contributionId, txHash, amount, telegramId, initData } = req.body;

      // Validate required fields
      if (!contributionId || !txHash || !amount || !telegramId) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Validate format
      if (!isValidObjectId(contributionId)) {
        return res.status(400).json({ error: "Invalid contribution ID" });
      }

      // SECURITY: Validate Telegram initData
      if (initData) {
        const validation = validateTelegramInitData(initData);
        if (!validation.valid || (validation.user && validation.user.id !== Number(telegramId))) {
          return res.status(401).json({ error: "Invalid authentication" });
        }
      } else if (!config.isDev) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // SECURITY: Verify transaction on-chain
      console.log(`🔍 Verifying transaction ${txHash} on-chain...`);
      const txVerification = await verifyTransaction(txHash);

      if (!txVerification.verified) {
        console.warn(`Transaction ${txHash} not verified on-chain`);
        return res.status(400).json({ error: "Transaction not found or failed on-chain" });
      }

      console.log(`✅ Transaction verified: from=${txVerification.from}, to=${txVerification.to}`);

      // Update contribution status
      const contribution = await Contribution.findByIdAndUpdate(
        contributionId,
        { status: "confirmed", txHash },
        { new: true }
      );

      if (!contribution) {
        return res.status(404).json({ error: "Contribution not found" });
      }

      // Update vaquita balance
      let vaquita = await Vaquita.findByIdAndUpdate(
        contribution.vaquitaId,
        { $inc: { currentAmount: amount } },
        { new: true }
      );

      // Check if goal has been reached - mark as completed
      if (vaquita && vaquita.currentAmount >= vaquita.goalAmount && vaquita.status === "active") {
        console.log(`🎉 Vaquita "${vaquita.name}" reached goal! Marking as completed.`);
        vaquita = await Vaquita.findByIdAndUpdate(
          vaquita._id,
          { status: "completed" },
          { new: true }
        );
      }

      res.json({ success: true, contribution, vaquita });
    } catch (error) {
      console.error("Contribution API Error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // =============================================================================
  // SECURE: Process Withdrawal (only for vaquita creator)
  // =============================================================================
  app.post("/api/withdraw", strictLimiter, async (req: Request, res: Response) => {
    try {
      const { vaquitaId, telegramId, initData } = req.body;

      // Validate required fields
      if (!vaquitaId || !telegramId) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      if (!isValidObjectId(vaquitaId)) {
        return res.status(400).json({ error: "Invalid vaquita ID" });
      }

      // SECURITY: Validate Telegram initData
      if (initData) {
        const validation = validateTelegramInitData(initData);
        if (!validation.valid || (validation.user && validation.user.id !== Number(telegramId))) {
          return res.status(401).json({ error: "Invalid authentication" });
        }
      } else if (!config.isDev) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Get vaquita
      const vaquita = await Vaquita.findById(vaquitaId).populate("creatorId");
      if (!vaquita) {
        return res.status(404).json({ error: "Vaquita not found" });
      }

      // Get user
      const user = await User.findOne({ telegramId: Number(telegramId) });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // SECURITY: Verify user is the creator
      if (!vaquita.creatorId.equals(user._id)) {
        return res.status(403).json({ error: "Only the creator can withdraw" });
      }

      // Verify goal is reached
      if (vaquita.currentAmount < vaquita.goalAmount) {
        return res.status(400).json({ error: "Goal not yet reached" });
      }

      // Verify vaquita has pool wallet
      if (!vaquita.poolPlayerId || !vaquita.poolWalletAddress) {
        return res.status(400).json({ error: "Pool wallet not configured" });
      }

      // Verify user has wallet
      if (!user.walletAddress) {
        return res.status(400).json({ error: "User wallet not configured" });
      }

      // Create withdrawal transaction
      console.log(`💸 Processing withdrawal of ${vaquita.currentAmount} USDC to ${user.walletAddress}`);

      const withdrawal = await createWithdrawalIntent(
        vaquita.poolPlayerId,
        user.walletAddress,
        vaquita.currentAmount
      );

      // Mark vaquita as withdrawn (funds have been transferred)
      vaquita.status = "withdrawn";
      vaquita.completedAt = new Date();
      await vaquita.save();

      res.json({
        success: true,
        transactionIntentId: withdrawal.transactionIntentId,
        userOperationHash: withdrawal.userOperationHash,
        amount: vaquita.currentAmount,
      });
    } catch (error) {
      console.error("Withdrawal API Error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // =============================================================================
  // ERROR HANDLING MIDDLEWARE
  // =============================================================================
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error("Express error:", err);

    // Don't expose internal errors
    if (err.message === "Not allowed by CORS") {
      return res.status(403).json({ error: "CORS not allowed" });
    }

    res.status(500).json({ error: "Internal server error" });
  });

  // Start HTTP API server
  app.listen(API_PORT, () => {
    console.log(`🌐 API server running on port ${API_PORT}`);
    console.log(`🔒 CORS allowed origins: ${allowedOrigins.join(", ")}`);
  });

  // Start bot
  console.log("🤖 Starting bot...");
  await bot.start({
    onStart: (botInfo) => {
      console.log(`✅ Bot @${botInfo.username} is running!`);
    },
  });
}

// =============================================================================
// WEBAPP DATA HANDLERS
// =============================================================================

async function handleWalletConnected(ctx: Context, data: any) {
  const { telegramId, walletAddress, openfortPlayerId } = data;

  // Validate wallet address
  if (!isValidEthereumAddress(walletAddress)) {
    await ctx.reply("❌ Dirección de wallet inválida.");
    return;
  }

  await User.findOneAndUpdate(
    { telegramId },
    { walletAddress, openfortPlayerId },
    { new: true }
  );

  await ctx.reply(
    `✅ *¡Wallet conectada\\!*\n\n` +
      `Dirección: \`${walletAddress}\`\n\n` +
      `Ya puedes usar La Vaquita\\. Usa /help para ver los comandos\\.`,
    { parse_mode: "MarkdownV2" }
  );
}

async function handleContributionConfirmed(ctx: Context, data: any) {
  const { contributionId, txHash, amount } = data;

  // Verify transaction on-chain before updating
  const txVerification = await verifyTransaction(txHash);
  if (!txVerification.verified) {
    await ctx.reply(
      "⚠️ No pudimos verificar la transacción en blockchain.\n\n" +
        "Si crees que es un error, contacta al soporte."
    );
    return;
  }

  // Update contribution
  const contribution = await Contribution.findByIdAndUpdate(
    contributionId,
    { status: "confirmed", txHash },
    { new: true }
  );

  if (!contribution) return;

  // Update vaquita balance
  const vaquita = await Vaquita.findByIdAndUpdate(
    contribution.vaquitaId,
    { $inc: { currentAmount: amount } },
    { new: true }
  );

  if (!vaquita) return;

  const percentage = Math.round((vaquita.currentAmount / vaquita.goalAmount) * 100);

  await ctx.reply(
    `✅ *¡Aporte confirmado\\!*\n\n` +
      `💵 *Monto:* ${escapeMarkdown(formatUSDC(amount))}\n` +
      `📝 *Vaquita:* ${escapeMarkdown(vaquita.name)}\n` +
      `💰 *Pool:* ${escapeMarkdown(formatUSDC(vaquita.currentAmount))} \\(${percentage}%\\)\n\n` +
      `🔗 [Ver transacción](https://sepolia.basescan.org/tx/${txHash})`,
    { parse_mode: "MarkdownV2", link_preview_options: { is_disabled: true } }
  );
}

async function handleWithdrawalConfirmed(ctx: Context, data: any) {
  const { vaquitaId, txHash, amount } = data;

  // Mark vaquita as completed
  const vaquita = await Vaquita.findByIdAndUpdate(
    vaquitaId,
    { status: "completed", completedAt: new Date() },
    { new: true }
  );

  if (!vaquita) return;

  await ctx.reply(
    `🎉 *¡Vaquita completada\\!*\n\n` +
      `📝 *${escapeMarkdown(vaquita.name)}*\n` +
      `💰 *Retirado:* ${escapeMarkdown(formatUSDC(amount))}\n\n` +
      `Gracias a todos los que participaron\\!\n\n` +
      `🔗 [Ver transacción](https://sepolia.basescan.org/tx/${txHash})`,
    { parse_mode: "MarkdownV2", link_preview_options: { is_disabled: true } }
  );
}

// Run
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
