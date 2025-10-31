import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Question } from '@/models/Question';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const assignmentId = request.nextUrl.searchParams.get('assignmentId');
    
    const query = assignmentId ? { assignmentId } : {};
    const questions = await Question.find(query).sort({ questionNumber: 1 });
    return NextResponse.json(questions);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const question = await Question.create(body);
    return NextResponse.json(question, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create question' }, { status: 500 });
  }
}

