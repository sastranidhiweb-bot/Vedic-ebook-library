import { NextRequest, NextResponse } from 'next/server';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';

interface BookMetadata {
  title: string;
  author?: string;
  category?: string;
  description?: string;
  tags?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const metadata = JSON.parse(formData.get('metadata') as string) as BookMetadata;
    
    if (!file || !file.name.endsWith('.docx')) {
      return NextResponse.json({ error: 'Please upload a valid Word document (.docx)' }, { status: 400 });
    }

    // Create unique filename
    const timestamp = Date.now();
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}_${sanitizedFilename}`;
    const filepath = path.join(process.cwd(), 'public', 'books', filename);

    // Save file to disk
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(filepath, buffer);

    // Convert to HTML for preview
    const result = await mammoth.convertToHtml({ buffer });
    const htmlContent = result.value;

    // Create metadata file
    const metadataFile = {
      id: `book_${timestamp}`,
      title: metadata.title || file.name.replace('.docx', ''),
      author: metadata.author,
      filename: filename,
      originalName: file.name,
      uploadDate: new Date().toISOString(),
      fileSize: formatFileSize(file.size),
      description: metadata.description,
      tags: metadata.category ? [metadata.category, ...(metadata.tags || [])] : metadata.tags,
      lastRead: null,
      currentPage: 0,
      totalPages: 0,
      contentLength: htmlContent.length
    };

    const metadataPath = path.join(process.cwd(), 'public', 'books', `${filename}.meta.json`);
    fs.writeFileSync(metadataPath, JSON.stringify(metadataFile, null, 2));

    return NextResponse.json({ 
      success: true, 
      book: metadataFile,
      message: 'Book uploaded successfully' 
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}