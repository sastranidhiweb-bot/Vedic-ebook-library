import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: bookId } = await params;
  try {
    // Proxy the request to the backend API
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL;
    const response = await fetch(`${backendUrl}/api/books/${bookId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        // Forward cookies/auth headers if needed
      },
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
