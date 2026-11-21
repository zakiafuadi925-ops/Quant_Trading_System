/**
 * Webhook Notification Service for Institutional Quant Terminal
 * Dispatches real-time alerts to Telegram Bot and Discord Webhook channels.
 */

export interface TradeAlertPayload {
  title: string;
  symbol: string;
  side: string;
  price: number;
  quantity?: number;
  reason?: string;
  pnl?: number;
  timestamp?: string;
}

/**
 * Send notification to Telegram Channel via Telegram Bot API
 */
export async function sendTelegramNotification(payload: TradeAlertPayload): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    return false;
  }

  const pnlText = payload.pnl !== undefined
    ? `\n💰 <b>Realized PnL:</b> ${payload.pnl >= 0 ? '+$' : '-$'}${Math.abs(payload.pnl).toFixed(2)}`
    : '';

  const message = `⚡ <b>QUANT LAB EXECUTION ALERT</b> ⚡
<b>Event:</b> ${payload.title}
📊 <b>Asset:</b> ${payload.symbol}
🎯 <b>Side:</b> ${payload.side}
💵 <b>Price:</b> $${payload.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
📦 <b>Quantity:</b> ${payload.quantity ?? 1}${pnlText}
📝 <b>Reason:</b> ${payload.reason || 'SYSTEM_EXECUTION'}
⏰ <b>Time:</b> ${payload.timestamp || new Date().toISOString()}`;

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    });
    return res.ok;
  } catch (err) {
    console.warn('[Webhook] Telegram dispatch error:', (err as any)?.message || err);
    return false;
  }
}

/**
 * Send rich embed alert to Discord Webhook
 */
export async function sendDiscordNotification(payload: TradeAlertPayload): Promise<boolean> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    return false;
  }

  const isProfit = (payload.pnl ?? 0) >= 0;
  const color = payload.side === 'LONG' || payload.side === 'BUY'
    ? 0x10b981 // Emerald
    : isProfit ? 0x06b6d4 // Cyan
    : 0xf43f5e; // Rose

  const embed = {
    title: `⚡ ${payload.title}`,
    color,
    fields: [
      { name: 'Asset', value: payload.symbol, inline: true },
      { name: 'Action / Side', value: payload.side, inline: true },
      { name: 'Executed Price', value: `$${payload.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, inline: true },
      { name: 'Reason', value: payload.reason || 'Auto Matching Trigger', inline: true },
      ...(payload.pnl !== undefined ? [{ name: 'Realized PnL', value: `${payload.pnl >= 0 ? '+$' : '-$'}${Math.abs(payload.pnl).toFixed(2)}`, inline: true }] : [])
    ],
    footer: { text: 'Bitcoin Research & Quant Terminal Engine' },
    timestamp: new Date().toISOString()
  };

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] })
    });
    return res.ok;
  } catch (err) {
    console.warn('[Webhook] Discord dispatch error:', (err as any)?.message || err);
    return false;
  }
}

/**
 * Broadcast notification across all configured webhook channels
 */
export async function broadcastTradeAlert(payload: TradeAlertPayload): Promise<{ telegram: boolean; discord: boolean }> {
  const [telegram, discord] = await Promise.all([
    sendTelegramNotification(payload),
    sendDiscordNotification(payload)
  ]);
  return { telegram, discord };
}
