import { NextRequest, NextResponse } from 'next/server';
import { getD1Client } from '@/lib/d1-client';
import { v4 as uuidv4 } from 'uuid';

// GET: Check database for configured status code and return it
export async function GET(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  try {
    const db = getD1Client();
    const route = await db.queryFirst<{
      id: string;
      path: string;
      status_code: number;
    }>(
      'SELECT id, path, status_code FROM test_error_routes WHERE path = ?',
      [pathname]
    );

    if (route) {
      // Return the configured status code
      const statusCode = route.status_code;
      const message = statusCode === 200 
        ? 'OK' 
        : statusCode === 404 
        ? 'Not Found' 
        : statusCode === 500 
        ? 'Internal Server Error'
        : `HTTP ${statusCode}`;
      
      return NextResponse.json(
        { 
          error: statusCode >= 400 ? message : undefined,
          message: statusCode < 400 ? message : undefined,
          configured: true,
          path: route.path,
          status_code: statusCode,
        },
        { status: statusCode }
      );
    }

    // No configuration found, return normal response
    return NextResponse.json({ 
      message: 'No error configuration found for this path',
      configured: false,
    });
  } catch (error) {
    console.error('Error checking test error route:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST: Set status code for a path
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path, status_code } = body;

    if (!path || typeof status_code !== 'number') {
      return NextResponse.json(
        { error: 'path and status_code are required' },
        { status: 400 }
      );
    }

    // Validate status code
    if (status_code < 100 || status_code > 599) {
      return NextResponse.json(
        { error: 'status_code must be between 100 and 599' },
        { status: 400 }
      );
    }

    const db = getD1Client();
    const now = Date.now();

    // Check if route already exists
    const existing = await db.queryFirst<{ id: string }>(
      'SELECT id FROM test_error_routes WHERE path = ?',
      [path]
    );

    if (existing) {
      // Update existing route
      await db.execute(
        'UPDATE test_error_routes SET status_code = ?, updated_at = ? WHERE path = ?',
        [status_code, now, path]
      );
    } else {
      // Insert new route
      const id = uuidv4();
      await db.execute(
        'INSERT INTO test_error_routes (id, path, status_code, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [id, path, status_code, now, now]
      );
    }

    return NextResponse.json({
      success: true,
      path,
      status_code,
      message: existing ? 'Route updated' : 'Route created',
    });
  } catch (error) {
    console.error('Error setting test error route:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// DELETE: Remove configuration for a path
export async function DELETE(request: NextRequest) {
  try {
    // Try to get path from query parameter or request body
    const { searchParams } = new URL(request.url);
    let path = searchParams.get('path');

    // If not in query, try body
    if (!path) {
      try {
        const body = await request.json();
        path = body.path;
      } catch {
        // Body parsing failed, continue with path = null
      }
    }

    if (!path) {
      return NextResponse.json(
        { error: 'path parameter is required (query param or body)' },
        { status: 400 }
      );
    }

    const db = getD1Client();
    await db.execute(
      'DELETE FROM test_error_routes WHERE path = ?',
      [path]
    );

    return NextResponse.json({
      success: true,
      message: 'Route configuration removed',
      path,
    });
  } catch (error) {
    console.error('Error deleting test error route:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

