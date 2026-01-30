import { Context } from "grammy";
import { User, Vaquita, Contribution } from "../models/index.js";
import { formatVaquitaStatus } from "../utils/index.js";

export async function handleEstado(ctx: Context) {
  const telegramUser = ctx.from;
  if (!telegramUser) return;

  // Get user
  const user = await User.findOne({ telegramId: telegramUser.id });
  if (!user) {
    await ctx.reply("❌ Primero usa /start para registrarte.");
    return;
  }

  // Find user's active vaquita (as member)
  const vaquita = await Vaquita.findOne({
    members: user._id,
    status: "active",
  });

  if (!vaquita) {
    await ctx.reply(
      "ℹ️ No estás en ninguna vaquita activa.\n\n" +
        "Usa /crear para crear una o /unirse para unirte a una existente."
    );
    return;
  }

  // Get all confirmed contributions for this vaquita
  const contributions = await Contribution.find({
    vaquitaId: vaquita._id,
    status: "confirmed",
  }).populate("userId");

  // Format and aggregate contributions by user
  const contributionsByUser = new Map<string, { user: any; total: number }>();
  for (const c of contributions) {
    const userId = c.userId.toString();
    if (!contributionsByUser.has(userId)) {
      contributionsByUser.set(userId, { user: c.userId, total: 0 });
    }
    contributionsByUser.get(userId)!.total += c.amount;
  }

  const aggregatedContributions = Array.from(contributionsByUser.values()).map(
    (item) => ({
      user: item.user,
      amount: item.total,
    })
  );

  // Format message
  const message = formatVaquitaStatus(vaquita, aggregatedContributions as any);

  await ctx.reply(message, { parse_mode: "MarkdownV2" });
}
