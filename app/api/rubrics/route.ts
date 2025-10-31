import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Rubric } from '@/models/Rubric';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const questionId = request.nextUrl.searchParams.get('questionId');
    
    const query = questionId ? { questionId } : {};
    const rubrics = await Rubric.find(query).sort({ points: -1 });
    return NextResponse.json(rubrics);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch rubrics' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const rubric = await Rubric.create(body);
    return NextResponse.json(rubric, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create rubric' }, { status: 500 });
  }
}

