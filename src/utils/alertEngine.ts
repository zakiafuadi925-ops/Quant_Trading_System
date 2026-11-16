/**
 * Alert & Webhook Notification Engine (v6.1.0)
 * 
 * Features:
 * - High-conviction Ensemble trigger alerts (Confluence Score >= 70).
 * - Supertrend direction flip detection (Bullish <-> Bearish).
 * - Dynamic price threshold crossing alerts (Above / Below level).
 * - Multi-channel dispatching: Telegram Bot API & Discord Webhook.
 * - In-app notification queue and trigger event history audit log.
 * - Cooldown & anti-spam debouncing per rule.
 */

export type AlertType = 
  | 'ENSEMBLE_CONFLUENCE' 
  | 'SUPERTREND_FLIP' 
  | 'PRICE_THRESHOLD' 
  | 'ML_PREDICTION' 
  | 'MARGIN_CALL_WARNING';

export type AlertChannel = 'TELEGRAM' | 'DISCORD' | 'IN_APP';

export interface AlertRule {
  id: string;
  name: string;
  type: AlertType;
  symbol: string;
  enabled: boolean;
  channels: AlertChannel[];
  threshold?: number;           // e.g., 70 for ensemble, or price level
  direction?: 'ABOVE' | 'BELOW' | 'BULLISH' | 'BEARISH';
  cooldownMinutes: number;      // Minimum minutes between trigger fires
  lastTriggeredTimestamp?: number;
}

export interface AlertEvent {
  id: string;
  ruleId: string;
  ruleName: string;
  symbol: string;
  type: AlertType;
  message: string;
  channels: AlertChannel[];
  timestamp: number;
  dispatched: boolean;
  error?: string;
}

export interface WebhookConfig {
  telegramBotToken?: string;
  telegramChatId?: string;
  discordWebhookUrl?: string;
}

export interface MarketEvaluationContext {
  symbol: string;
  currentPrice: number;
  confluenceScore?: number;
  supertrendDirection?: number; // 1 = Bullish, -1 = Bearish
  prevSupertrendDirection?: number;
  mlPredictedReturn?: number;
  freeMarginRatio?: number;     // For margin call warning
}

const STORAGE_KEY_RULES = 'quant_alert_rules_v6';
const STORAGE_KEY_WEBHOOK = 'quant_webhook_config_v6';
const STORAGE_KEY_HISTORY = 'quant_alert_history_v6';

/**
 * Default preset alert rules.
 */
export const DEFAULT_ALERT_RULES: AlertRule[] = [
  {
    id: 'rule_ensemble_70',
    name: 'Ensemble High-Conviction Confluence (Score >= 70)',
    type: 'ENSEMBLE_CONFLUENCE',
    symbol: 'BTC',
    enabled: true,
    channels: ['IN_APP', 'TELEGRAM', 'DISCORD'],
    threshold: 70,
    direction: 'ABOVE',
    cooldownMinutes: 30
  },
  {
    id: 'rule_supertrend_flip',
    name: 'Supertrend Direction Flip (Trend Reversal)',
    type: 'SUPERTREND_FLIP',
    symbol: 'BTC',
    enabled: true,
    channels: ['IN_APP', 'TELEGRAM'],
    cooldownMinutes: 15
  },
  {
    id: 'rule_margin_warning',
    name: 'Critical Margin Call Warning (Free Margin < 20%)',
    type: 'MARGIN_CALL_WARNING',
    symbol: 'ALL',
    enabled: true,
    channels: ['IN_APP', 'DISCORD'],
    threshold: 20,
    cooldownMinutes: 10
  }
];

/**
 * Format Telegram markdown message.
 */
export function formatTelegramMessage(event: AlertEvent, context: MarketEvaluationContext): string {
  const timeStr = new Date(event.timestamp).toUTCString();
  return (
    `🚨 *QUANT ALERT TRIGGERED* 🚨\n\n` +
    `*Event:* ${event.ruleName}\n` +
    `*Asset:* ${event.symbol}/USDT\n` +
    `*Market Price:* $${context.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n` +
    `*Details:* ${event.message}\n` +
    `*Time:* ${timeStr}\n\n` +
    `_Quant Trading System v6.1.0 Institutional Execution Engine_`
  );
}

/**
 * Format Discord embed webhook payload.
 */
export function formatDiscordPayload(event: AlertEvent, context: MarketEvaluationContext): object {
  const color = event.type === 'MARGIN_CALL_WARNING' ? 0xff3333 : 0x00cc66; // Red or Emerald
  return {
    username: 'Quant Execution Alert Bot',
    avatar_url: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png',
    embeds: [
      {
        title: `🚨 ${event.ruleName}`,
        description: event.message,
        color,
        fields: [
          { name: 'Asset', value: `${event.symbol}/USDT`, inline: true },
          { name: 'Current Price', value: `$${context.currentPrice.toLocaleString()}`, inline: true },
          { name: 'Trigger Type', value: event.type, inline: true }
        ],
        footer: {
          text: 'Quant Trading System v6.1.0 • Automated Dispatcher'
        },
        timestamp: new Date(event.timestamp).toISOString()
      }
    ]
  };
}

/**
 * Dispatch message to Telegram Bot API.
 */
export async function dispatchTelegramAlert(
  botToken: string,
  chatId: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  if (!botToken || !chatId) {
    return { success: false, error: 'Missing Telegram bot token or chat ID.' };
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown'
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: `Telegram API error: ${res.statusText} (${JSON.stringify(errData)})` };
    }

    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMsg };
  }
}

/**
 * Dispatch message to Discord Webhook.
 */
export async function dispatchDiscordAlert(
  webhookUrl: string,
  payload: object
): Promise<{ success: boolean; error?: string }> {
  if (!webhookUrl) {
    return { success: false, error: 'Missing Discord webhook URL.' };
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      return { success: false, error: `Discord Webhook error: ${res.status} ${res.statusText}` };
    }

    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMsg };
  }
}

/**
 * Evaluate alert rules against current live market state.
 */
export function evaluateAlertRules(
  rules: AlertRule[],
  context: MarketEvaluationContext
): { updatedRules: AlertRule[]; triggeredEvents: AlertEvent[] } {
  const now = Date.now();
  const triggeredEvents: AlertEvent[] = [];
  const updatedRules: AlertRule[] = [];

  for (const rule of rules) {
    if (!rule.enabled) {
      updatedRules.push(rule);
      continue;
    }

    // Symbol filter check (matches specific symbol or 'ALL')
    if (rule.symbol !== 'ALL' && rule.symbol.toUpperCase() !== context.symbol.toUpperCase()) {
      updatedRules.push(rule);
      continue;
    }

    // Cooldown check
    if (rule.lastTriggeredTimestamp) {
      const elapsedMinutes = (now - rule.lastTriggeredTimestamp) / (1000 * 60);
      if (elapsedMinutes < rule.cooldownMinutes) {
        updatedRules.push(rule);
        continue;
      }
    }

    let isTriggered = false;
    let detailMessage = '';

    switch (rule.type) {
      case 'ENSEMBLE_CONFLUENCE': {
        const score = context.confluenceScore ?? 0;
        const target = rule.threshold ?? 70;
        if (score >= target) {
          isTriggered = true;
          detailMessage = `Ensemble Confluence Score surged to ${score}/100 (Threshold: >= ${target}). Strong quantitative directional signal detected!`;
        }
        break;
      }

      case 'SUPERTREND_FLIP': {
        if (
          context.supertrendDirection !== undefined &&
          context.prevSupertrendDirection !== undefined &&
          context.supertrendDirection !== context.prevSupertrendDirection
        ) {
          isTriggered = true;
          const dirStr = context.supertrendDirection === 1 ? 'BULLISH (UP)' : 'BEARISH (DOWN)';
          detailMessage = `Supertrend flipped direction to ${dirStr} at $${context.currentPrice.toLocaleString()}.`;
        }
        break;
      }

      case 'PRICE_THRESHOLD': {
        if (rule.threshold) {
          if (rule.direction === 'ABOVE' && context.currentPrice >= rule.threshold) {
            isTriggered = true;
            detailMessage = `Price crossed ABOVE threshold $${rule.threshold.toLocaleString()} at $${context.currentPrice.toLocaleString()}.`;
          } else if (rule.direction === 'BELOW' && context.currentPrice <= rule.threshold) {
            isTriggered = true;
            detailMessage = `Price crossed BELOW threshold $${rule.threshold.toLocaleString()} at $${context.currentPrice.toLocaleString()}.`;
          }
        }
        break;
      }

      case 'MARGIN_CALL_WARNING': {
        if (context.freeMarginRatio !== undefined && rule.threshold !== undefined) {
          if (context.freeMarginRatio < rule.threshold) {
            isTriggered = true;
            detailMessage = `Free Margin critically low at ${context.freeMarginRatio.toFixed(1)}% (Threshold: < ${rule.threshold}%). Consider reducing leverage or closing open positions!`;
          }
        }
        break;
      }

      default:
        break;
    }

    if (isTriggered) {
      const event: AlertEvent = {
        id: `alt_${now}_${Math.random().toString(36).substring(2, 6)}`,
        ruleId: rule.id,
        ruleName: rule.name,
        symbol: context.symbol,
        type: rule.type,
        message: detailMessage,
        channels: rule.channels,
        timestamp: now,
        dispatched: false
      };
      triggeredEvents.push(event);
      updatedRules.push({
        ...rule,
        lastTriggeredTimestamp: now
      });
    } else {
      updatedRules.push(rule);
    }
  }

  return { updatedRules, triggeredEvents };
}

/**
 * Storage helpers.
 */
export function loadAlertRules(): AlertRule[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(STORAGE_KEY_RULES);
      if (raw) return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to load alert rules', e);
  }
  return DEFAULT_ALERT_RULES;
}

export function saveAlertRules(rules: AlertRule[]): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY_RULES, JSON.stringify(rules));
    }
  } catch (e) {
    console.warn('Failed to save alert rules', e);
  }
}

export function loadWebhookConfig(): WebhookConfig {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(STORAGE_KEY_WEBHOOK);
      if (raw) return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to load webhook config', e);
  }
  return {};
}

export function saveWebhookConfig(config: WebhookConfig): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY_WEBHOOK, JSON.stringify(config));
    }
  } catch (e) {
    console.warn('Failed to save webhook config', e);
  }
}

export function loadAlertHistory(): AlertEvent[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(STORAGE_KEY_HISTORY);
      if (raw) return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to load alert history', e);
  }
  return [];
}

export function saveAlertHistory(history: AlertEvent[]): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history.slice(0, 50))); // Keep last 50
    }
  } catch (e) {
    console.warn('Failed to save alert history', e);
  }
}
