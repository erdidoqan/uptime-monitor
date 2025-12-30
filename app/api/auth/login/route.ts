import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getD1Client } from '@/lib/d1-client';
import { signToken } from '@/lib/auth';
import { errorResponse as apiErrorResponse, successResponse } from '@/lib/api-helpers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return apiErrorResponse('Email and password are required');
    }

    const db = getD1Client();

    // Find user
    const user = await db.queryFirst<{
      id: string;
      email: string;
      password_hash: string;
    }>('SELECT id, email, password_hash FROM users WHERE email = ?', [email]);

    if (!user) {
      return apiErrorResponse('Invalid credentials', 401);
    }

    // Verify password
    if (!user.password_hash) {
      return apiErrorResponse('Invalid credentials', 401);
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return apiErrorResponse('Invalid credentials', 401);
    }

    // Generate JWT
    const token = signToken({ userId: user.id, email: user.email });

    return successResponse({ token, user: { id: user.id, email: user.email } });
  } catch (error: any) {
    console.error('Login error:', error);
    return apiErrorResponse(error.message || 'Login failed', 500);
  }
}

