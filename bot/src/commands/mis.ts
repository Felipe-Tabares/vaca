import { Context } from "grammy";
import { User, Vaquita } from "../models/index.js";
import { formatUSDC, escapeMarkdown } from "../utils/index.js";

export async function handleMis(ctx: Context) {
  const telegramUser = ctx.from;
  if (!telegramUser) return;

  // Get user
  const user = await User.findOne({ telegramId: telegramUser.id });
  if (!user) {
    await ctx.reply("❌ Primero usa /start para registrarte.");
    return;
  }

  // Find all vaquitas where user is a member
  const vaquitas = await Vaquita.find({
    members: user._id,
  }).sort({ createdAt: -1 });

  if (vaquitas.length === 0) {
    await ctx.reply(
      "ℹ️ No tienes ninguna vaquita\\.\n\n" +
        "Usa /crear para crear una o /unirse para unirte a una existente\\.",
      { parse_mode: "MarkdownV2" }
    );
    return;
  }

  let msg = `🐄 *Tus Vaquitas \\(${vaquitas.length}\\)*\n`;
  msg += `${"═".repeat(20)}\n\n`;

  for (const v of vaquitas) {
    const isCreator = v.creatorId.equals(user._id);
    const percentage = Math.round((v.currentAmount / v.goalAmount) * 100);
    const statusEmoji = v.status === "active" ? "🟢" : v.status === "completed" ? "✅" : "❌";

    msg += `${statusEmoji} *${escapeMarkdown(v.name)}*\n`;
    msg += `   💰 ${escapeMarkdown(formatUSDC(v.currentAmount))} / ${escapeMarkdown(formatUSDC(v.goalAmount))} \\(${percentage}%\\)\n`;
    msg += `   🔑 Código: \`${v.code}\`\n`;
    if (isCreator) {
      msg += `   👑 Eres el creador\n`;
    }
    msg += `\n`;
  }

  msg += `Usa /estado para ver detalles de tu vaquita activa\\.`;

  await ctx.reply(msg, { parse_mode: "MarkdownV2" });
}
