/**
 * Lightweight, zero-dependency alerting utility.
 * Sends instant notifications to Telegram or Discord when critical errors occur.
 *
 * Environment variables (optional):
 * - TELEGRAM_BOT_TOKEN & TELEGRAM_CHAT_ID
 * - DISCORD_WEBHOOK_URL
 */

export interface AlertPayload {
  title: string;
  message: string;
  level?: 'info' | 'warn' | 'error' | 'fatal';
  requestId?: string;
  metadata?: Record<string, any>;
}

export async function sendCriticalAlert(payload: AlertPayload): Promise<void> {
  const levelEmoji = {
    info: 'ℹ️',
    warn: '⚠️',
    error: '❌',
    fatal: '🚨'
  }[payload.level || 'error'];

  const timeStr = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });

  const discordWebhookUrl = typeof process !== 'undefined' ? process.env?.DISCORD_WEBHOOK_URL : undefined;
  if (discordWebhookUrl && discordWebhookUrl.startsWith('https://discord.com/api/webhooks/')) {
    try {
      const color = payload.level === 'fatal' ? 0xff0000 : payload.level === 'warn' ? 0xffa500 : 0xe74c3c;
      await fetch(discordWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [
            {
              title: `${levelEmoji} [Senadda Platform] ${payload.title}`,
              description: payload.message,
              color,
              fields: [
                { name: 'Time (WITA)', value: timeStr, inline: true },
                ...(payload.requestId ? [{ name: 'Request ID', value: `\`${payload.requestId}\``, inline: true }] : []),
                ...(payload.metadata
                  ? [{ name: 'Details', value: `\`\`\`json\n${JSON.stringify(payload.metadata, null, 2).slice(0, 500)}\n\`\`\`` }]
                  : [])
              ]
            }
          ]
        })
      });
    } catch (err) {
      console.warn('[Alert] Discord webhook delivery failed:', err);
    }
  }

  const telegramBotToken = typeof process !== 'undefined' ? process.env?.TELEGRAM_BOT_TOKEN : undefined;
  const telegramChatId = typeof process !== 'undefined' ? process.env?.TELEGRAM_CHAT_ID : undefined;

  if (telegramBotToken && telegramChatId) {
    try {
      const text = `${levelEmoji} *[Senadda Alert] ${payload.title}*\n\n` +
        `📝 ${payload.message}\n` +
        `🕒 Waktu: ${timeStr} WITA\n` +
        (payload.requestId ? `🔑 Ref ID: \`${payload.requestId}\`\n` : '') +
        (payload.metadata ? `\n\`\`\`\n${JSON.stringify(payload.metadata, null, 2).slice(0, 400)}\n\`\`\`` : '');

      await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text,
          parse_mode: 'Markdown'
        })
      });
    } catch (err) {
      console.warn('[Alert] Telegram alert delivery failed:', err);
    }
  }
}
