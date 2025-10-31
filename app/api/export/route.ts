import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Assignment } from '@/models/Assignment';
import { Question } from '@/models/Question';
import { Submission } from '@/models/Submission';
import { Answer } from '@/models/Answer';
import { Rubric } from '@/models/Rubric';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const assignmentId = request.nextUrl.searchParams.get('assignmentId');
    
    if (!assignmentId) {
      return NextResponse.json({ error: 'Assignment ID required' }, { status: 400 });
    }

    const assignment = await Assignment.findById(assignmentId);
    const questions = await Question.find({ assignmentId }).sort({ questionNumber: 1 });
    const submissions = await Submission.find({ assignmentId });
    
    // Build CSV header
    const headers = ['Student Name', 'Student Email', 'Submitted At'];
    for (const question of questions) {
      const questionMaxPoints = (question.pointsPercentage / 100) * (assignment?.totalPoints || 100);
      headers.push(`Q${question.questionNumber} Answer`);
      headers.push(`Q${question.questionNumber} Percentage`);
      headers.push(`Q${question.questionNumber} Points (out of ${questionMaxPoints.toFixed(2)})`);
      headers.push(`Q${question.questionNumber} Feedback`);
    }
    headers.push('Total Percentage');
    headers.push(`Total Points (out of ${assignment?.totalPoints || 100})`);
    
    // Build CSV rows
    const rows: string[][] = [];
    
    for (const submission of submissions) {
      const row: string[] = [
        submission.studentName,
        submission.studentEmail,
        submission.submittedAt?.toISOString() || '',
      ];
      
      let totalPercentage = 0;
      
      for (const question of questions) {
        const answer = await Answer.findOne({
          submissionId: submission._id?.toString(),
          questionId: question._id?.toString(),
        });
        
        if (answer) {
          const questionMaxPoints = (question.pointsPercentage / 100) * (assignment?.totalPoints || 100);
          const earnedPercentage = ((answer.pointsPercentage || 0) / 100) * question.pointsPercentage;
          const earnedPoints = ((answer.pointsPercentage || 0) / 100) * questionMaxPoints;
          
          totalPercentage += earnedPercentage;
          
          row.push(`"${answer.answerText.replace(/"/g, '""')}"`);
          row.push((answer.pointsPercentage || 0).toFixed(2) + '%');
          row.push(earnedPoints.toFixed(2));
          row.push(`"${(answer.feedback || '').replace(/"/g, '""')}"`);
        } else {
          row.push('');
          row.push('0%');
          row.push('0');
          row.push('');
        }
      }
      
      const totalPoints = (totalPercentage / 100) * (assignment?.totalPoints || 100);
      row.push(totalPercentage.toFixed(2) + '%');
      row.push(totalPoints.toFixed(2));
      rows.push(row);
    }
    
    // Create CSV content
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${assignment?.title || 'export'}_grades.csv"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 });
  }
}
