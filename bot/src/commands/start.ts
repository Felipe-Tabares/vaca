import { Context, InlineKeyboard } from "grammy";
import { User } from "../models/index.js";
import { config } from "../config/index.js";
import { welcomeMessage } from "../utils/format.js";

export async function handleStart(ctx: Context) {
  const telegramUser = ctx.from;
  if (!telegramUser) return;

  // Find or create user
  let user = await User.findOne({ telegramId: telegramUser.id });

  if (!user) {
    user = await User.create({
      telegramId: telegramUser.id,
      username: telegramUser.username,
      firstName: telegramUser.first_name,
    });
  }

  // Check if user has connected wallet
  if (user.walletAddress) {
    await ctx.reply(
      `🐄 ¡Hola de nuevo, ${user.firstName || "amigo"}!\n\n` +
        `Tu wallet: \`${user.walletAddress}\`\n\n` +
        `Usa /help para ver los comandos disponibles.`,
      { parse_mode: "Markdown" }
    );
    return;
  }

  // User needs to connect wallet - show Mini App button
  const keyboard = new InlineKeyboard().webApp(
    "🔗 Conectar Wallet",
    `${config.webappUrl}?telegramId=${telegramUser.id}`
  );

  await ctx.reply(welcomeMessage(telegramUser.first_name || "amigo"), {
    parse_mode: "MarkdownV2",
    reply_markup: keyboard,
  });
}
