import { Context, InlineKeyboard } from "grammy";
import { User, Vaquita, Contribution } from "../models/index.js";
import { config } from "../config/index.js";
import { formatUSDC, escapeMarkdown } from "../utils/index.js";

export async function handleAportar(ctx: Context) {
  const telegramUser = ctx.from;
  if (!telegramUser) return;

  // Get user
  const user = await User.findOne({ telegramId: telegramUser.id });
  if (!user) {
    await ctx.reply("❌ Primero usa /start para registrarte.");
    return;
  }

  if (!user.walletAddress) {
    await ctx.reply("❌ Primero conecta tu wallet con /start");
    return;
  }

  // Parse amount: /aportar 20
  const text = ctx.message?.text || "";
  const match = text.match(/\/aportar\s+(\d+(?:\.\d+)?)/);

  if (!match) {
    await ctx.reply(
      "❌ Formato incorrecto\\.\n\n" +
        "*Uso:* `/aportar monto`\n\n" +
        "*Ejemplo:* `/aportar 20`",
      { parse_mode: "MarkdownV2" }
    );
    return;
  }

  const amount = parseFloat(match[1]);

  // Validations
  if (amount < 0.01) {
    await ctx.reply("❌ El monto mínimo es $0.01 USDC");
    return;
  }

  if (amount > 1000) {
    await ctx.reply("❌ El monto máximo por aporte es $1,000 USDC");
    return;
  }

  // Find user's active vaquita (as member)
  const vaquita = await Vaquita.findOne({
    members: user._id,
    status: "active",
  });

  if (!vaquita) {
    await ctx.reply(
      "❌ No estás en ninguna vaquita activa.\n\n" +
        "Usa /crear para crear una o /unirse para unirte a una existente."
    );
    return;
  }

  // Check if already reached goal
  if (vaquita.currentAmount >= vaquita.goalAmount) {
    await ctx.reply(
      "✅ ¡Esta vaquita ya alcanzó su meta!\n\n" +
        "El creador puede usar /retirar para distribuir los fondos."
    );
    return;
  }

  // Calculate remaining needed
  const remaining = vaquita.goalAmount - vaquita.currentAmount;
  const actualAmount = Math.min(amount, remaining);

  // Create pending contribution
  const contribution = await Contribution.create({
    vaquitaId: vaquita._id,
    userId: user._id,
    amount: actualAmount,
    status: "pending",
  });

  // Use openfortUserId if available (for legacy users), otherwise use telegramId
  const openfortId = user.openfortUserId || telegramUser.id;

  // Open Mini App to confirm and execute transaction
  const keyboard = new InlineKeyboard().webApp(
    "💸 Confirmar Aporte",
    `${config.webappUrl}/#/contribute?` +
      `wallet=${user.walletAddress}` +
      `&openfortUserId=${openfortId}` +
      `&telegramId=${telegramUser.id}` +
      `&contributionId=${contribution._id}` +
      `&amount=${actualAmount}` +
      `&vaquitaName=${encodeURIComponent(vaquita.name)}` +
      `&poolWallet=${vaquita.poolWalletAddress || ""}`
  );

  await ctx.reply(
    `💰 *Confirmar aporte*\n\n` +
      `📝 *Vaquita:* ${escapeMarkdown(vaquita.name)}\n` +
      `💵 *Monto:* ${escapeMarkdown(formatUSDC(actualAmount))}\n\n` +
      `Presiona el botón para confirmar la transacción:`,
    {
      parse_mode: "MarkdownV2",
      reply_markup: keyboard,
    }
  );
}
