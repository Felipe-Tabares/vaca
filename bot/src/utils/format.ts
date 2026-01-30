import type { IVaquita, IContribution, IUser } from "../models/index.js";

/**
 * Format currency amount
 */
export function formatUSDC(amount: number): string {
  return `$${amount.toFixed(2)} USDC`;
}

/**
 * Format wallet address (truncated)
 */
export function formatAddress(address: string): string {
  if (!address) return "No conectada";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Generate progress bar
 */
export function progressBar(current: number, goal: number, length = 10): string {
  const percentage = Math.min(current / goal, 1);
  const filled = Math.round(percentage * length);
  const empty = length - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

/**
 * Format vaquita status message
 */
export function formatVaquitaStatus(
  vaquita: IVaquita,
  contributions: (IContribution & { user?: IUser })[]
): string {
  const percentage = Math.round((vaquita.currentAmount / vaquita.goalAmount) * 100);
  const remaining = vaquita.goalAmount - vaquita.currentAmount;

  let msg = `🐄 *${escapeMarkdown(vaquita.name)}*\n`;
  msg += `${"═".repeat(20)}\n\n`;
  msg += `🎯 Meta: ${escapeMarkdown(formatUSDC(vaquita.goalAmount))}\n`;
  msg += `💰 Pool: ${escapeMarkdown(formatUSDC(vaquita.currentAmount))}\n`;
  msg += `${progressBar(vaquita.currentAmount, vaquita.goalAmount)} ${percentage}%\n\n`;

  if (contributions.length > 0) {
    msg += `👥 *Contribuciones:*\n`;
    for (const c of contributions) {
      const name = c.user?.firstName || c.user?.username || "Anónimo";
      msg += `• ${escapeMarkdown(name)}: ${escapeMarkdown(formatUSDC(c.amount))}\n`;
    }
    msg += "\n";
  }

  if (remaining > 0) {
    msg += `⏳ Faltan: ${escapeMarkdown(formatUSDC(remaining))}`;
  } else {
    msg += `✅ ¡Meta alcanzada\\!`;
  }

  return msg;
}

/**
 * Escape special characters for Telegram MarkdownV2
 */
export function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
}

/**
 * Welcome message for new users
 */
export function welcomeMessage(firstName: string): string {
  return `
🐄 *¡Bienvenido a La Vaquita, ${escapeMarkdown(firstName)}\\!*

La forma más fácil de juntar dinero con tus amigos\\.

*¿Cómo funciona?*
1\\. Conecta tu wallet
2\\. Crea o únete a una vaquita
3\\. Aporta y ve el progreso en tiempo real
4\\. Cuando se alcanza la meta, el creador retira

*Primero, conecta tu wallet:*
`;
}

/**
 * Help message with all commands
 */
export function helpMessage(): string {
  return `
🐄 *Comandos de La Vaquita*

*Wallet:*
/start \\- Conectar wallet
/balance \\- Ver tu balance

*Vaquitas:*
/crear \\<nombre\\> \\<meta\\> \\- Crear nueva vaquita
/unirse \\<código\\> \\- Unirse a una vaquita
/aportar \\<monto\\> \\- Contribuir al pool
/estado \\- Ver estado de tu vaquita activa
/mis \\- Ver todas tus vaquitas

*Administrar:*
/retirar \\- Retirar fondos \\(solo creador\\)
/cancelar \\- Cancelar vaquita \\(solo creador\\)

*Ayuda:*
/help \\- Mostrar este mensaje
`;
}
