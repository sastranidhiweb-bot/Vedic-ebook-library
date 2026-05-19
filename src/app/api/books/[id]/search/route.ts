import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = searchParams.get('limit');

    if (!query) {
      return NextResponse.json({ success: false, message: 'Query parameter required' }, { status: 400 });
    }

    const { id } = await params;
    console.log('🔄 Proxying search request for book:', id, 'query:', query);

    // Forward the request to the backend
    const backendUrl = `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/books/${id}/search?q=${encodeURIComponent(query)}${limit ? `&limit=${encodeURIComponent(limit)}` : ''}`;
    console.log('📡 Backend URL:', backendUrl);

    const response = await fetch(backendUrl);

    if (!response.ok) {
      console.error('❌ Backend search failed:', response.status, response.statusText);
      return NextResponse.json(
        { success: false, message: 'Backend search failed' }, 
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Backend search successful, results:', data.data?.results?.length || 0);

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Search proxy error:', error);
    return NextResponse.json(
      { success: false, message: 'Search proxy error' }, 
      { status: 500 }
    );
  }
}