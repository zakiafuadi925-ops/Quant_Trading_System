import {
  evaluateAlertRules,
  formatTelegramMessage,
  formatDiscordPayload,
  AlertRule,
  MarketEvaluationContext,
  AlertEvent
} from '../src/utils/alertEngine';

describe('Alert & Webhook Notification Engine', () => {
  const sampleRules: AlertRule[] = [
    {
      id: 'rule_ensemble',
      name: 'High-Conviction Ensemble Trigger',
      type: 'ENSEMBLE_CONFLUENCE',
      symbol: 'BTC',
      enabled: true,
      channels: ['TELEGRAM', 'IN_APP'],
      threshold: 70,
      direction: 'ABOVE',
      cooldownMinutes: 30
    },
    {
      id: 'rule_supertrend',
      name: 'Supertrend Direction Flip',
      type: 'SUPERTREND_FLIP',
      symbol: 'BTC',
      enabled: true,
      channels: ['TELEGRAM', 'DISCORD'],
      cooldownMinutes: 15
    },
    {
      id: 'rule_price',
      name: 'BTC Breaks 95k Resistance',
      type: 'PRICE_THRESHOLD',
      symbol: 'BTC',
      enabled: true,
      channels: ['DISCORD'],
      threshold: 95000,
      direction: 'ABOVE',
      cooldownMinutes: 60
    },
    {
      id: 'rule_margin',
      name: 'Critical Margin Call Warning',
      type: 'MARGIN_CALL_WARNING',
      symbol: 'ALL',
      enabled: true,
      channels: ['IN_APP', 'DISCORD'],
      threshold: 20,
      cooldownMinutes: 10
    }
  ];

  it('triggers Ensemble confluence alert when score >= 70', () => {
    const context: MarketEvaluationContext = {
      symbol: 'BTC',
      currentPrice: 91200,
      confluenceScore: 78
    };

    const { updatedRules, triggeredEvents } = evaluateAlertRules(sampleRules, context);
    
    expect(triggeredEvents).toHaveLength(1);
    expect(triggeredEvents[0].ruleId).toBe('rule_ensemble');
    expect(triggeredEvents[0].message).toContain('78/100');
    expect(triggeredEvents[0].channels).toContain('TELEGRAM');

    // Rule should be marked with lastTriggeredTimestamp
    const ensembleRule = updatedRules.find((r) => r.id === 'rule_ensemble');
    expect(ensembleRule?.lastTriggeredTimestamp).toBeDefined();
  });

  it('respects cooldown window for recently triggered rules', () => {
    const recentTriggerTime = Date.now() - 5 * 60 * 1000; // 5 mins ago (cooldown is 30 mins)
    const rulesWithCooldown: AlertRule[] = sampleRules.map((r) => 
      r.id === 'rule_ensemble' ? { ...r, lastTriggeredTimestamp: recentTriggerTime } : r
    );

    const context: MarketEvaluationContext = {
      symbol: 'BTC',
      currentPrice: 91500,
      confluenceScore: 85
    };

    const { triggeredEvents } = evaluateAlertRules(rulesWithCooldown, context);
    const ensembleTrigger = triggeredEvents.find((e) => e.ruleId === 'rule_ensemble');
    expect(ensembleTrigger).toBeUndefined();
  });

  it('triggers Supertrend flip when direction inverts', () => {
    const context: MarketEvaluationContext = {
      symbol: 'BTC',
      currentPrice: 92000,
      supertrendDirection: 1, // Flipped to Bullish
      prevSupertrendDirection: -1 // Was Bearish
    };

    const { triggeredEvents } = evaluateAlertRules(sampleRules, context);
    const supertrendEvent = triggeredEvents.find((e) => e.ruleId === 'rule_supertrend');
    expect(supertrendEvent).toBeDefined();
    expect(supertrendEvent?.message).toContain('BULLISH');
  });

  it('triggers Price threshold alerts on breakout above level', () => {
    const context: MarketEvaluationContext = {
      symbol: 'BTC',
      currentPrice: 95400 // Crossed 95000
    };

    const { triggeredEvents } = evaluateAlertRules(sampleRules, context);
    const priceEvent = triggeredEvents.find((e) => e.ruleId === 'rule_price');
    expect(priceEvent).toBeDefined();
    expect(priceEvent?.message).toContain('crossed ABOVE threshold');
  });

  it('triggers Margin Call warning on low free margin ratio', () => {
    const context: MarketEvaluationContext = {
      symbol: 'BTC',
      currentPrice: 90000,
      freeMarginRatio: 14.5 // < 20%
    };

    const { triggeredEvents } = evaluateAlertRules(sampleRules, context);
    const marginEvent = triggeredEvents.find((e) => e.ruleId === 'rule_margin');
    expect(marginEvent).toBeDefined();
    expect(marginEvent?.message).toContain('14.5%');
  });

  it('formats valid Markdown for Telegram bot API', () => {
    const event: AlertEvent = {
      id: 'alt_1',
      ruleId: 'rule_1',
      ruleName: 'Test High Confluence Alert',
      symbol: 'BTC',
      type: 'ENSEMBLE_CONFLUENCE',
      message: 'Ensemble score hit 82',
      channels: ['TELEGRAM'],
      timestamp: Date.now(),
      dispatched: false
    };

    const msg = formatTelegramMessage(event, { symbol: 'BTC', currentPrice: 91500 });
    expect(msg).toContain('QUANT ALERT TRIGGERED');
    expect(msg).toContain('BTC/USDT');
    expect(msg).toContain('$91,500');
  });

  it('formats compliant embed object for Discord Webhook', () => {
    const event: AlertEvent = {
      id: 'alt_2',
      ruleId: 'rule_margin',
      ruleName: 'Critical Margin Call Warning',
      symbol: 'BTC',
      type: 'MARGIN_CALL_WARNING',
      message: 'Free margin under 15%',
      channels: ['DISCORD'],
      timestamp: Date.now(),
      dispatched: false
    };

    const payload = formatDiscordPayload(event, { symbol: 'BTC', currentPrice: 90000 }) as {
      embeds: Array<{ title: string; color: number; fields: Array<{ name: string; value: string }> }>;
    };

    expect(payload.embeds).toHaveLength(1);
    expect(payload.embeds[0].title).toContain('Critical Margin Call Warning');
    expect(payload.embeds[0].color).toBe(0xff3333); // Red color for critical warning
  });
});
