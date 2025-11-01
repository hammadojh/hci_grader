import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { BatchUpload } from '@/models/BatchUpload';

// GET: Get batch upload status
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const batchId = request.nextUrl.searchParams.get('batchId');
    
    if (!batchId) {
      return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 });
    }
    
    const batch = await BatchUpload.findById(batchId);
    
    if (!batch) {
      return NextResponse.json({ error: 'Batch upload not found' }, { status: 404 });
    }
    
    return NextResponse.json(batch);
  } catch (error) {
    console.error('Batch upload GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch batch upload status' }, { status: 500 });
  }
}

// POST: Initialize a new batch upload
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { assignmentId, files } = body;
    
    if (!assignmentId || !files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: 'Assignment ID and files array are required' },
        { status: 400 }
      );
    }
    
    // Create batch upload record
    const batchUpload = await BatchUpload.create({
      assignmentId,
      totalFiles: files.length,
      completedFiles: 0,
      failedFiles: 0,
      status: 'pending',
      files: files.map((file: { name: string; size: number }) => ({
        fileName: file.name,
        fileSize: file.size,
        status: 'pending',
        progress: 0,
      })),
    });
    
    return NextResponse.json({
      batchId: batchUpload._id,
      message: 'Batch upload initialized',
      totalFiles: files.length,
    }, { status: 201 });
    
  } catch (error) {
    console.error('Batch upload POST error:', error);
    return NextResponse.json({ error: 'Failed to initialize batch upload' }, { status: 500 });
  }
}

// PUT: Update batch upload status
export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { batchId, updates } = body;
    
    if (!batchId) {
      return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 });
    }
    
    const batch = await BatchUpload.findByIdAndUpdate(
      batchId,
      updates,
      { new: true, runValidators: true }
    );
    
    if (!batch) {
      return NextResponse.json({ error: 'Batch upload not found' }, { status: 404 });
    }
    
    return NextResponse.json(batch);
  } catch (error) {
    console.error('Batch upload PUT error:', error);
    return NextResponse.json({ error: 'Failed to update batch upload' }, { status: 500 });
  }
}

