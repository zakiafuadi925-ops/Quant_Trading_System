import { Request, Response } from 'express';
import crypto from 'crypto';
import { UserModel } from '../db/models/User.js';
import { PaperAccountModel } from '../db/models/PaperAccount.js';
import { connectToDatabase } from '../db/mongodb.js';
import { hashPassword, verifyPassword, signJwt } from '../utils/auth.js';
import { isValidEmail } from '../middlewares/sanitizer.js';
import { recordLedgerTransaction } from '../services/ledgerService.js';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';

export async function registerUser(req: Request, res: Response) {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: email, password, and name are required.'
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email address format.'
      });
    }

    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    await connectToDatabase();

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await UserModel.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email address already exists.'
      });
    }

    const userId = `usr_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const { hash, salt } = hashPassword(password);

    const user = await UserModel.create({
      userId,
      email: normalizedEmail,
      name: name.trim(),
      passwordHash: hash,
      salt,
      role: 'trader',
      lastLoginAt: new Date()
    });

    // Automatically initialize multi-tenant Paper Trading account with $10,000 for this user
    await PaperAccountModel.create({
      accountId: userId,
      initialBalance: 10000,
      balance: 10000,
      equity: 10000,
      totalFeesPaid: 0,
      totalRealizedPnl: 0,
      lastFundingTimestamp: Date.now()
    });

    // Record genesis entry in immutable financial ledger
    await recordLedgerTransaction({
      accountId: userId,
      type: 'INITIAL_DEPOSIT',
      amount: 10000,
      balanceBefore: 0,
      balanceAfter: 10000,
      description: 'Initial paper trading portfolio balance deposit'
    });

    const token = signJwt({
      userId: user.userId,
      email: user.email,
      name: user.name,
      role: user.role
    });

    return res.status(201).json({
      success: true,
      message: 'User registered successfully and trading account provisioned.',
      token,
      user: {
        userId: user.userId,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error: any) {
    console.error('[Register Error]:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Internal error during registration.'
    });
  }
}

export async function loginUser(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    await connectToDatabase();

    const normalizedEmail = email.toLowerCase().trim();
    const user = await UserModel.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const isMatch = verifyPassword(password, user.passwordHash, user.salt);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = signJwt({
      userId: user.userId,
      email: user.email,
      name: user.name,
      role: user.role
    });

    return res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        userId: user.userId,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error: any) {
    console.error('[Login Error]:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Internal error during login.'
    });
  }
}

export async function getCurrentUser(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    await connectToDatabase();
    const account = await PaperAccountModel.findOne({ accountId: req.user.userId });

    return res.json({
      success: true,
      user: req.user,
      account: account || {
        accountId: req.user.userId,
        balance: 10000,
        equity: 10000
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Failed to retrieve user profile.'
    });
  }
}
