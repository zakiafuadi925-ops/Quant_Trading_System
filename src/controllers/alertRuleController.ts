import { connectToDatabase } from '../db/mongodb.js';
import { AlertRuleModel } from '../db/models/AlertRule.js';
import { DEFAULT_ALERT_RULES } from '../utils/alertEngine';

export async function getAlertRulesFromDb() {
  await connectToDatabase();
  let rules = await AlertRuleModel.find().sort({ createdAt: 1 });
  if (rules.length === 0) {
    // Seed default rules if database is empty
    await AlertRuleModel.insertMany(DEFAULT_ALERT_RULES.map((r) => ({
      ruleId: r.id,
      name: r.name,
      type: r.type,
      symbol: r.symbol,
      enabled: r.enabled,
      channels: r.channels,
      threshold: r.threshold,
      direction: r.direction,
      cooldownMinutes: r.cooldownMinutes
    })));
    rules = await AlertRuleModel.find().sort({ createdAt: 1 });
  }
  return rules;
}

export async function toggleAlertRuleInDb(ruleId: string, enabled: boolean) {
  await connectToDatabase();
  const rule = await AlertRuleModel.findOneAndUpdate(
    { ruleId },
    { enabled },
    { new: true }
  );
  return rule;
}

export async function saveAlertRuleInDb(ruleData: any) {
  await connectToDatabase();
  const rule = await AlertRuleModel.findOneAndUpdate(
    { ruleId: ruleData.ruleId || ruleData.id },
    { ...ruleData },
    { upsert: true, new: true }
  );
  return rule;
}
