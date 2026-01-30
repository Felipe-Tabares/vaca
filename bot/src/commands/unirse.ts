import { Context } from "grammy";
import { User, Vaquita } from "../models/index.js";
import { formatUSDC, escapeMarkdown } from "../utils/index.js";

export async function handleUnirse(ctx: Context) {
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

  // Parse code: /unirse ABC123
  const text = ctx.message?.text || "";
  const match = text.match(/\/unirse\s+([A-Za-z0-9]{6})/);

  if (!match) {
    await ctx.reply(
      "❌ Formato incorrecto\\.\n\n" +
        "*Uso:* `/unirse CODIGO`\n\n" +
        "*Ejemplo:* `/unirse ABC123`",
      { parse_mode: "MarkdownV2" }
    );
    return;
  }

  const code = match[1].toUpperCase();

  // Find vaquita
  const vaquita = await Vaquita.findOne({ code, status: "active" });

  if (!vaquita) {
    await ctx.reply(
      "❌ No se encontró ninguna vaquita activa con ese código.\n\n" +
        "Verifica el código e intenta de nuevo."
    );
    return;
  }

  // Check if already a member
  if (vaquita.members.some((m) => m.equals(user._id))) {
    await ctx.reply(
      `ℹ️ Ya eres miembro de *${escapeMarkdown(vaquita.name)}*\n\n` +
        `Usa /estado para ver el progreso\\.`,
      { parse_mode: "MarkdownV2" }
    );
    return;
  }

  // Add user to members
  vaquita.members.push(user._id);
  await vaquita.save();

  // Get member count
  const memberCount = vaquita.members.length;

  await ctx.reply(
    `🎉 *¡Te uniste a la vaquita\\!*\n\n` +
      `📝 *Nombre:* ${escapeMarkdown(vaquita.name)}\n` +
      `🎯 *Meta:* ${escapeMarkdown(formatUSDC(vaquita.goalAmount))}\n` +
      `💰 *Pool actual:* ${escapeMarkdown(formatUSDC(vaquita.currentAmount))}\n` +
      `👥 *Miembros:* ${memberCount}\n\n` +
      `Usa /aportar \\<monto\\> para contribuir\\.`,
    { parse_mode: "MarkdownV2" }
  );
}
