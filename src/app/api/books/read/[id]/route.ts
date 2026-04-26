import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: bookId } = await params;
    const booksDir = path.join(process.cwd(), 'public', 'books');
    
    // Find metadata file for this book ID
    const files = fs.readdirSync(booksDir);
    let bookMetadata = null;
    let metadataFile = null;
    
    for (const file of files) {
      if (file.endsWith('.meta.json')) {
        const metadata = JSON.parse(fs.readFileSync(path.join(booksDir, file), 'utf-8'));
        if (metadata.id === bookId) {
          bookMetadata = metadata;
          metadataFile = file;
          break;
        }
      }
    }

    if (!bookMetadata) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    const bookPath = path.join(booksDir, bookMetadata.filename);
    
    if (!fs.existsSync(bookPath)) {
      return NextResponse.json({ error: 'Book file not found' }, { status: 404 });
    }

    // Read and convert the Word document
    const buffer = fs.readFileSync(bookPath);
    const result = await mammoth.convertToHtml({ buffer });
    
    return NextResponse.json({ 
      content: result.value,
      metadata: bookMetadata
    });
    
  } catch (error) {
    console.error('Error reading book:', error);
    return NextResponse.json({ error: 'Failed to read book' }, { status: 500 });
  }
}