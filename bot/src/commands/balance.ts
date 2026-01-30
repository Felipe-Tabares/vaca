import { Context, InlineKeyboard } from "grammy";
import { User } from "../models/index.js";
import { config } from "../config/index.js";
import { formatAddress } from "../utils/index.js";

export async function handleBalance(ctx: Context) {
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

  // Open Mini App to view balance (balance is fetched client-side via Openfort)
  const keyboard = new InlineKeyboard().webApp(
    "💰 Ver Balance",
    `${config.webappUrl}/balance?telegramId=${telegramUser.id}`
  );

  await ctx.reply(
    `💳 *Tu Wallet*\n\n` +
      `Dirección: \`${user.walletAddress}\`\n\n` +
      `Presiona el botón para ver tu balance:`,
    {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    }
  );
}
