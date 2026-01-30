import { Context } from "grammy";
import { User, Vaquita, Contribution } from "../models/index.js";
import { escapeMarkdown } from "../utils/index.js";

export async function handleCancelar(ctx: Context) {
  const telegramUser = ctx.from;
  if (!telegramUser) return;

  // Get user
  const user = await User.findOne({ telegramId: telegramUser.id });
  if (!user) {
    await ctx.reply("❌ Primero usa /start para registrarte.");
    return;
  }

  // Find vaquita where user is CREATOR
  const vaquita = await Vaquita.findOne({
    creatorId: user._id,
    status: "active",
  });

  if (!vaquita) {
    await ctx.reply(
      "❌ No tienes ninguna vaquita activa que hayas creado\\.\n\n" +
        "Solo el creador puede cancelar una vaquita\\.",
      { parse_mode: "MarkdownV2" }
    );
    return;
  }

  // Check if there are contributions
  if (vaquita.currentAmount > 0) {
    await ctx.reply(
      `⚠️ *No se puede cancelar*\n\n` +
        `La vaquita *${escapeMarkdown(vaquita.name)}* tiene fondos\\.\n\n` +
        `Los fondos deben ser devueltos a los contribuyentes antes de cancelar\\.\n` +
        `Contacta al soporte si necesitas ayuda\\.`,
      { parse_mode: "MarkdownV2" }
    );
    return;
  }

  // Cancel the vaquita
  vaquita.status = "cancelled";
  await vaquita.save();

  // Cancel any pending contributions
  await Contribution.updateMany(
    { vaquitaId: vaquita._id, status: "pending" },
    { status: "cancelled" }
  );

  await ctx.reply(
    `✅ *Vaquita cancelada*\n\n` +
      `📝 *${escapeMarkdown(vaquita.name)}* ha sido cancelada\\.\n\n` +
      `Puedes crear una nueva vaquita con /crear`,
    { parse_mode: "MarkdownV2" }
  );
}
