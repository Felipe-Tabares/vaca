import { Context } from "grammy";
import { User, Vaquita } from "../models/index.js";
import { createVaquitaCode, formatUSDC, escapeMarkdown } from "../utils/index.js";
import { createPoolWallet } from "../services/index.js";

export async function handleCrear(ctx: Context) {
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

  // Parse arguments: /crear "Nombre" 100
  const text = ctx.message?.text || "";
  const match = text.match(/\/crear\s+[""]?([^""]+)[""]?\s+(\d+(?:\.\d+)?)/);

  if (!match) {
    await ctx.reply(
      "❌ Formato incorrecto\\.\n\n" +
        "*Uso:* `/crear \"Nombre de la vaquita\" monto`\n\n" +
        "*Ejemplo:* `/crear \"Cumple de Ana\" 50`",
      { parse_mode: "MarkdownV2" }
    );
    return;
  }

  const name = match[1].trim();
  const goalAmount = parseFloat(match[2]);

  // Validations
  if (name.length > 50) {
    await ctx.reply("❌ El nombre no puede tener más de 50 caracteres.");
    return;
  }

  if (goalAmount < 1) {
    await ctx.reply("❌ La meta debe ser al menos $1 USDC.");
    return;
  }

  if (goalAmount > 10000) {
    await ctx.reply("❌ La meta no puede ser mayor a $10,000 USDC.");
    return;
  }

  // Check if user already has an active vaquita they created
  const existingVaquita = await Vaquita.findOne({
    creatorId: user._id,
    status: "active",
  });

  if (existingVaquita) {
    await ctx.reply(
      `❌ Ya tienes una vaquita activa: *${escapeMarkdown(existingVaquita.name)}*\n\n` +
        `Complétala o cancélala antes de crear otra\\.`,
      { parse_mode: "MarkdownV2" }
    );
    return;
  }

  // Generate unique code
  let code = createVaquitaCode();
  while (await Vaquita.findOne({ code })) {
    code = createVaquitaCode();
  }

  // Show creating message
  const creatingMsg = await ctx.reply(
    "⏳ Creando vaquita y pool wallet...\n\nEsto puede tomar unos segundos."
  );

  try {
    // Create pool wallet for this vaquita
    const { playerId, walletAddress } = await createPoolWallet(code);

    // Create vaquita with pool wallet
    const vaquita = await Vaquita.create({
      code,
      name,
      goalAmount,
      creatorId: user._id,
      members: [user._id],
      poolPlayerId: playerId,
      poolWalletAddress: walletAddress,
    });

    // Delete creating message
    await ctx.api.deleteMessage(ctx.chat!.id, creatingMsg.message_id).catch(() => {});

    await ctx.reply(
      `🐄 *¡Vaquita creada\\!*\n\n` +
        `📝 *Nombre:* ${escapeMarkdown(name)}\n` +
        `🎯 *Meta:* ${escapeMarkdown(formatUSDC(goalAmount))}\n` +
        `🔑 *Código:* \`${code}\`\n` +
        `💳 *Pool Wallet:* \`${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}\`\n\n` +
        `Comparte este código con tus amigos para que se unan:\n` +
        `👉 \`/unirse ${code}\``,
      { parse_mode: "MarkdownV2" }
    );
  } catch (error) {
    console.error("Error creating vaquita:", error);

    // Delete creating message
    await ctx.api.deleteMessage(ctx.chat!.id, creatingMsg.message_id).catch(() => {});

    await ctx.reply(
      "❌ Error al crear la vaquita. Por favor intenta de nuevo.\n\n" +
        "Si el problema persiste, contacta al soporte."
    );
  }
}
