import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Submission } from '@/models/Submission';
import { Answer } from '@/models/Answer';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const submissionId = params.id;
    
    // Delete all associated answers first
    await Answer.deleteMany({ submissionId });
    
    // Then delete the submission
    const submission = await Submission.findByIdAndDelete(submissionId);
    
    if (!submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Submission and associated answers deleted successfully'
    });
  } catch (error) {
    console.error('Delete submission error:', error);
    return NextResponse.json(
      { error: 'Failed to delete submission' },
      { status: 500 }
    );
  }
}

