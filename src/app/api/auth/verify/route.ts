import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'vedic-library-secret-key-change-in-production';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    return NextResponse.json({
      valid: true,
      user: {
        id: decoded.userId,
        username: decoded.username,
        role: decoded.role,
        name: decoded.name
      }
    });

  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json(
      { valid: false, error: 'Invalid or expired token' },
      { status: 401 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Token verification endpoint'
  });
}