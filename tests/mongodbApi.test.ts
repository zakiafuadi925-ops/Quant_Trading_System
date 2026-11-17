import { connectToDatabase } from '../src/db/mongodb';
import { PaperAccountModel } from '../src/db/models/PaperAccount';
import { PaperPositionModel } from '../src/db/models/PaperPosition';
import { PaperOrderModel } from '../src/db/models/PaperOrder';
import { PaperTradeModel } from '../src/db/models/PaperTrade';
import { AlertRuleModel } from '../src/db/models/AlertRule';

describe('MongoDB Cloud Atlas Models & Connection Manager', () => {
  it('gracefully handles missing MONGODB_URI without crashing application', async () => {
    const originalUri = process.env.MONGODB_URI;
    delete process.env.MONGODB_URI;

    const conn = await connectToDatabase();
    expect(conn).toBeNull();

    // Restore
    if (originalUri) process.env.MONGODB_URI = originalUri;
  });

  it('correctly initializes Mongoose Schemas for Paper Trading', () => {
    expect(PaperAccountModel.modelName).toBe('PaperAccount');
    expect(PaperPositionModel.modelName).toBe('PaperPosition');
    expect(PaperOrderModel.modelName).toBe('PaperOrder');
    expect(PaperTradeModel.modelName).toBe('PaperTrade');
    expect(AlertRuleModel.modelName).toBe('AlertRule');
  });

  it('validates Paper Account schema default fields', () => {
    const account = new PaperAccountModel({
      accountId: 'test_account'
    });

    expect(account.accountId).toBe('test_account');
    expect(account.initialBalance).toBe(10000);
    expect(account.balance).toBe(10000);
    expect(account.equity).toBe(10000);
    expect(account.totalFeesPaid).toBe(0);
  });

  it('validates Paper Position schema required fields', () => {
    const position = new PaperPositionModel({
      positionId: 'pos_test_1',
      accountId: 'test_account',
      symbol: 'BTC',
      side: 'LONG',
      entryPrice: 50000,
      markPrice: 50000,
      quantity: 0.1,
      notionalValue: 5000,
      leverage: 5,
      initialMargin: 1000,
      maintenanceMargin: 250,
      liquidationPrice: 47500
    });

    expect(position.positionId).toBe('pos_test_1');
    expect(position.symbol).toBe('BTC');
    expect(position.side).toBe('LONG');
    expect(position.leverage).toBe(5);
    expect(position.initialMargin).toBe(1000);
  });
});
