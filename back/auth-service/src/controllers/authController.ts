import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

const ACCESS_TOKEN_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_IN_DAYS = 30;
const IS_PROD = process.env.NODE_ENV === 'production';

export const register = async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const existing = await prisma.authUser.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email is already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.authUser.create({
      data: {
        email,
        passwordHash,
        status: 'ACTIVE',
      },
    });

    return res.status(201).json({
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      status: user.status,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('Error registering user:', error);
    return res.status(500).json({ error: 'Failed to register user' });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await prisma.authUser.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'User is not active' });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const accessToken = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRES_IN },
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      JWT_REFRESH_SECRET,
      { expiresIn: `${REFRESH_TOKEN_EXPIRES_IN_DAYS}d` },
    );

    const refreshExpiresAt = new Date();
    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + REFRESH_TOKEN_EXPIRES_IN_DAYS);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: refreshExpiresAt,
      },
    });

    res.cookie('rt', refreshToken, {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: 'lax',
      path: '/refresh',
      maxAge: REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        status: user.status,
      },
    });
  } catch (error) {
    console.error('Error logging in:', error);
    return res.status(500).json({ error: 'Failed to login' });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const tokenFromCookie: string | undefined = req.cookies?.rt;
    if (!tokenFromCookie) {
      return res.status(401).json({ error: 'No refresh token provided' });
    }

    const stored = await prisma.refreshToken.findUnique({
      where: { token: tokenFromCookie },
      include: { user: true },
    });

    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Refresh token is invalid or expired' });
    }

    let payload: any;
    try {
      payload = jwt.verify(tokenFromCookie, JWT_REFRESH_SECRET);
    } catch {
      return res.status(403).json({ error: 'Invalid refresh token' });
    }

    if (!payload || !payload.userId || payload.userId !== stored.userId) {
      return res.status(403).json({ error: 'Invalid refresh token payload' });
    }

    if (stored.user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'User is not active' });
    }

    const newAccessToken = jwt.sign(
      { userId: stored.user.id, email: stored.user.email },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRES_IN },
    );

    return res.status(200).json({ accessToken: newAccessToken });
  } catch (error) {
    console.error('Error refreshing token:', error);
    return res.status(500).json({ error: 'Failed to refresh token' });
  }
};