import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Rubric } from '@/models/Rubric';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();
    const body = await request.json();
    const { _id, ...updateData } = body;
    
    const rubric = await Rubric.findByIdAndUpdate(id, updateData, { new: true });
    if (!rubric) {
      return NextResponse.json({ error: 'Rubric not found' }, { status: 404 });
    }
    return NextResponse.json(rubric);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update rubric' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();
    const rubric = await Rubric.findByIdAndDelete(id);
    if (!rubric) {
      return NextResponse.json({ error: 'Rubric not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Rubric deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete rubric' }, { status: 500 });
  }
}

