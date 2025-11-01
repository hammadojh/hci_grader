import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Assignment } from '@/models/Assignment';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();
    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }
    return NextResponse.json(assignment);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch assignment' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    await connectDB();
    const assignment = await Assignment.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    );
    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }
    return NextResponse.json(assignment);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update assignment' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();
    const assignment = await Assignment.findByIdAndDelete(id);
    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete assignment' }, { status: 500 });
  }
}

