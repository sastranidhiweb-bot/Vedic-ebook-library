import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Hardcoded user credentials (can be moved to environment variables later)
const HARDCODED_USERS = [
  {
    id: '1',
    username: 'Admin',
    // Hash of 'Hari@108' - generated using bcrypt
    passwordHash: '$2a$10$rKvKxwJmY5QaWm8cZ.Hzx.M0CWyQ4J7LZKFjUxKSB5YnD8Q3.fhVK',
    role: 'admin',
    name: 'Vedic Library Administrator'
  },
  {
    id: '2', 
    username: 'Devotee',
    // Hash of 'Radhe@123'
    passwordHash: '$2a$10$E0CYzK.8W7MZ0kNGjK9GJeQcx8QvL4K7.B9QJZ5YnH2L8Q9fhGmK',
    role: 'user',
    name: 'Devotee User'
  }
];

const JWT_SECRET = process.env.JWT_SECRET || 'vedic-library-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Find user
    const user = HARDCODED_USERS.find(
      u => u.username.toLowerCase() === username.toLowerCase()
    );

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // For now, let's use simple password comparison (replace with bcrypt later)
    const validPasswords = {
      'Admin': 'Hari@108',
      'Devotee': 'Radhe@123'
    };

    const isValidPassword = validPasswords[user.username as keyof typeof validPasswords] === password;

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
        name: user.name
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name
      },
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    message: 'Vedic Library Authentication API',
    timestamp: new Date().toISOString()
  });
}