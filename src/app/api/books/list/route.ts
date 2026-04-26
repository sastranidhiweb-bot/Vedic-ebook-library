import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const booksDir = path.join(process.cwd(), 'public', 'books');
    
    // Ensure directory exists
    if (!fs.existsSync(booksDir)) {
      fs.mkdirSync(booksDir, { recursive: true });
      return NextResponse.json({ books: [] });
    }

    const files = fs.readdirSync(booksDir);
    const books = [];

    for (const file of files) {
      if (file.endsWith('.meta.json')) {
        try {
          const metadataPath = path.join(booksDir, file);
          const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
          
          // Check if actual book file exists
          const bookPath = path.join(booksDir, metadata.filename);
          if (fs.existsSync(bookPath)) {
            books.push(metadata);
          }
        } catch (error) {
          console.error(`Error reading metadata for ${file}:`, error);
        }
      }
    }

    // Sort by upload date (newest first)
    books.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());

    return NextResponse.json({ books });
  } catch (error) {
    console.error('Error listing books:', error);
    return NextResponse.json({ error: 'Failed to list books' }, { status: 500 });
  }
}