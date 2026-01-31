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

  // Find vaquita where user is CREATOR (completed = goal reached, not yet withdrawn)
  const vaquita = await Vaquita.findOne({
    creatorId: user._id,
    status: "completed", // Only allow withdrawal when goal is reached
  });

  if (!vaquita) {
    // Check if they have an active vaquita that hasn't reached the goal yet
    const activeVaquita = await Vaquita.findOne({
      creatorId: user._id,
      status: "active",
    });

    if (activeVaquita) {
      const remaining = activeVaquita.goalAmount - activeVaquita.currentAmount;
      if (remaining <= 0) {
        // Goal reached but status wasn't updated - fix it now
        await Vaquita.findByIdAndUpdate(activeVaquita._id, { status: "completed" });
        // Recursively call to show withdrawal option
        return handleRetirar(ctx);
      }
      await ctx.reply(
        `⏳ Tu vaquita "${activeVaquita.name}" aún no alcanza la meta.\n\n` +
          `💰 Pool: $${activeVaquita.currentAmount.toFixed(2)} / $${activeVaquita.goalAmount.toFixed(2)}\n` +
          `❌ Faltan: $${remaining.toFixed(2)} USDC`
      );
      return;
    }

    await ctx.reply(
      "❌ No tienes ninguna vaquita completada para retirar.\n\n" +
        "Usa /crear para crear una nueva vaquita."
    );
    return;
  }

  // Open Mini App to execute withdrawal (vaquita is already "completed" so goal was reached)
  const keyboard = new InlineKeyboard().webApp(
    "💸 Retirar Fondos",
    `${config.webappUrl}/#/withdraw?` +
      `wallet=${user.walletAddress}` +
      `&telegramId=${telegramUser.id}` +
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
