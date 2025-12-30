import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getD1Client } from '@/lib/d1-client';
import { signToken } from '@/lib/auth';
import { errorResponse, successResponse } from '@/lib/api-helpers';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return errorResponse('Email and password are required');
    }

    const db = getD1Client();

    // Check if user exists
    const existingUser = await db.queryFirst<{ id: string }>(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUser) {
      return errorResponse('User already exists', 409);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    const now = Date.now();

    // Create user
    await db.execute(
      'INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)',
      [userId, email, passwordHash, now]
    );

    // Generate JWT
    const token = signToken({ userId, email });

    return successResponse({ token, user: { id: userId, email } }, 201);
  } catch (error: any) {
    console.error('Register error:', error);
    return errorResponse(error.message || 'Registration failed', 500);
  }
}

