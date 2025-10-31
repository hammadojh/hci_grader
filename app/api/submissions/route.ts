import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Submission } from '@/models/Submission';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const assignmentId = request.nextUrl.searchParams.get('assignmentId');
    
    const query = assignmentId ? { assignmentId } : {};
    const submissions = await Submission.find(query).sort({ submittedAt: -1 });
    return NextResponse.json(submissions);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const submission = await Submission.create(body);
    return NextResponse.json(submission, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create submission' }, { status: 500 });
  }
}

