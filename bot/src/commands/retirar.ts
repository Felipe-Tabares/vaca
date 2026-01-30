import { Context, InlineKeyboard } from "grammy";
import { User, Vaquita } from "../models/index.js";
import { config } from "../config/index.js";
import { formatUSDC, escapeMarkdown } from "../utils/index.js";

export async function handleRetirar(ctx: Context) {
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

  // Find vaquita where user is CREATOR
  const vaquita = await Vaquita.findOne({
    creatorId: user._id,
    status: "active",
  });

  if (!vaquita) {
    await ctx.reply(
      "❌ No tienes ninguna vaquita activa que hayas creado.\n\n" +
        "Solo el creador puede retirar los fondos."
    );
    return;
  }

  // Check if goal reached
  if (vaquita.currentAmount < vaquita.goalAmount) {
    const remaining = vaquita.goalAmount - vaquita.currentAmount;
    await ctx.reply(
      `⏳ *Aún no se alcanza la meta*\n\n` +
        `📝 *Vaquita:* ${escapeMarkdown(vaquita.name)}\n` +
        `💰 *Pool:* ${escapeMarkdown(formatUSDC(vaquita.currentAmount))}\n` +
        `🎯 *Meta:* ${escapeMarkdown(formatUSDC(vaquita.goalAmount))}\n` +
        `❌ *Faltan:* ${escapeMarkdown(formatUSDC(remaining))}`,
      { parse_mode: "MarkdownV2" }
    );
    return;
  }

  // Open Mini App to execute withdrawal
  const keyboard = new InlineKeyboard().webApp(
    "💸 Retirar Fondos",
    `${config.webappUrl}/withdraw?` +
      `telegramId=${telegramUser.id}` +
      `&vaquitaId=${vaquita._id}` +
      `&amount=${vaquita.currentAmount}` +
      `&poolWallet=${vaquita.poolWalletAddress || ""}`
  );

  await ctx.reply(
    `✅ *¡Meta alcanzada\\!*\n\n` +
      `📝 *Vaquita:* ${escapeMarkdown(vaquita.name)}\n` +
      `💰 *Total a retirar:* ${escapeMarkdown(formatUSDC(vaquita.currentAmount))}\n\n` +
      `Los fondos serán enviados a tu wallet:\n` +
      `\`${user.walletAddress}\`\n\n` +
      `Presiona el botón para confirmar:`,
    {
      parse_mode: "MarkdownV2",
      reply_markup: keyboard,
    }
  );
}
