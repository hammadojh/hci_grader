import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Answer } from '@/models/Answer';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const submissionId = request.nextUrl.searchParams.get('submissionId');
    const questionId = request.nextUrl.searchParams.get('questionId');
    
    const query: any = {};
    if (submissionId) query.submissionId = submissionId;
    if (questionId) query.questionId = questionId;
    
    const answers = await Answer.find(query);
    return NextResponse.json(answers);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch answers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const answer = await Answer.create(body);
    return NextResponse.json(answer, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create answer' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { _id, ...updateData } = body;
    
    const answer = await Answer.findByIdAndUpdate(_id, updateData, { new: true });
    if (!answer) {
      return NextResponse.json({ error: 'Answer not found' }, { status: 404 });
    }
    return NextResponse.json(answer);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update answer' }, { status: 500 });
  }
}

