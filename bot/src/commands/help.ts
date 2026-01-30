import { Context } from "grammy";
import { helpMessage } from "../utils/index.js";

export async function handleHelp(ctx: Context) {
  await ctx.reply(helpMessage(), { parse_mode: "MarkdownV2" });
}
