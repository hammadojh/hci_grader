import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getOpenRouterClient } from '@/lib/openrouter';
import { GradingAgent } from '@/models/GradingAgent';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { 
      agentId, 
      questionText, 
      currentAnswer, 
      allAnswers, 
      rubrics,
      assignmentContext,
      agentPreviousFeedback,
      studentFullAssignment 
    } = body;
    
    // Get agent to determine which model to use
    const agent = await GradingAgent.findById(agentId);
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found.' },
        { status: 404 }
      );
    }

    // Get OpenRouter client and settings
    const { client: openai, settings } = await getOpenRouterClient();
    
    const modelToUse = agent.model || 'openai/gpt-4o-mini';

    if (!agentId || !questionText || !currentAnswer || !rubrics || !Array.isArray(rubrics)) {
      return NextResponse.json(
        { error: 'agentId, questionText, currentAnswer, and rubrics are required' },
        { status: 400 }
      );
    }

    // Build the default prompt with feedback requirements
    const defaultPrompt = `You are an expert grading assistant. Your task is to evaluate a student's answer based on the provided rubrics.

CRITICAL: For each rubric criteria, you MUST provide three things:
1. suggestedLevelIndex - the level number (0, 1, 2, etc.)
2. justification - positive feedback highlighting what the student did well (written in SECOND PERSON as bullet points)
3. improvementSuggestion - constructive feedback on improvement opportunities with specific examples (written in SECOND PERSON as bullet points)

IMPORTANT FORMATTING RULES:
- Write ALL feedback in SECOND PERSON (use "you", "your") as if speaking directly to the student
- DO NOT use third person ("the student", "they", "their")
- Format as bullet points using "• " at the start of each point
- The justification should focus on GOOD THINGS the student did well
- The improvementSuggestion should focus on IMPROVEMENT OPPORTUNITIES with specific examples when applicable
- Both fields are REQUIRED and must not be empty

Example of correct output:
{
  "suggestions": [
    {
      "rubricId": "abc123",
      "suggestedLevelIndex": 1,
      "justification": "• You clearly identified the main concepts\\n• Your explanation shows good understanding of the fundamentals\\n• You organized your thoughts in a logical structure",
      "improvementSuggestion": "• Consider adding specific examples to illustrate your points (e.g., real-world applications or case studies)\\n• Expand your analysis by connecting concepts to broader themes\\n• Try to address potential counterarguments to strengthen your argument"
    }
  ]
}

Steps:
1. Read the question and student's answer carefully
2. For each rubric criteria, evaluate the answer against each level
3. Select the most appropriate level
4. Write 2-3 bullet points for "justification" highlighting what the student did WELL
5. Write 2-3 bullet points for "improvementSuggestion" with specific, actionable improvements (include examples when applicable)
6. Consider all student answers for calibration

Return ONLY valid JSON with the exact structure shown above. All fields are required.`;

    // Use the custom grading agent prompt from settings, or default if not set
    const systemPrompt = settings.gradingAgentPrompt || defaultPrompt;
    
    console.log('Using prompt:', settings.gradingAgentPrompt ? 'CUSTOM from settings' : 'DEFAULT with feedback');
    console.log('Prompt length:', systemPrompt.length);
    console.log('Context includes:');
    console.log('  - Assignment context:', !!assignmentContext);
    console.log('  - Agent previous feedback:', agentPreviousFeedback?.length || 0, 'students');
    console.log('  - Student full assignment:', studentFullAssignment?.length || 0, 'questions');
    console.log('  - All answers for calibration:', allAnswers?.length || 0, 'students');

    // Build assignment context section
    let assignmentContextSection = '';
    if (assignmentContext) {
      assignmentContextSection = `## Assignment Context:
Title: ${assignmentContext.title}
${assignmentContext.description ? `Description: ${assignmentContext.description}\n` : ''}Total Points: ${assignmentContext.totalPoints}

`;
    }

    // Build agent's previous feedback section
    let previousFeedbackSection = '';
    if (agentPreviousFeedback && Array.isArray(agentPreviousFeedback) && agentPreviousFeedback.length > 0) {
      previousFeedbackSection = `## Your Previous Feedback on Other Students:\n`;
      previousFeedbackSection += `You have already graded ${agentPreviousFeedback.length} other student(s) for this question. Use these as reference for consistency:\n\n`;
      
      agentPreviousFeedback.forEach((feedback: any, idx: number) => {
        previousFeedbackSection += `Student ${idx + 1} Answer: ${feedback.answerText.substring(0, 200)}${feedback.answerText.length > 200 ? '...' : ''}\n`;
        if (feedback.suggestions && feedback.suggestions.length > 0) {
          previousFeedbackSection += `Your Grades:\n`;
          feedback.suggestions.forEach((sug: any) => {
            const rubric = rubrics.find((r: any) => r._id === sug.rubricId);
            previousFeedbackSection += `  - ${rubric?.criteriaName || 'Criteria'}: Level ${sug.suggestedLevelIndex}\n`;
            if (sug.justification) {
              previousFeedbackSection += `    Good things: ${sug.justification.substring(0, 100)}...\n`;
            }
          });
        }
        previousFeedbackSection += '\n';
      });
    }

    // Build student's full assignment section
    let studentFullAssignmentSection = '';
    if (studentFullAssignment && Array.isArray(studentFullAssignment) && studentFullAssignment.length > 0) {
      studentFullAssignmentSection = `## Current Student's Full Assignment Submission:\n`;
      studentFullAssignmentSection += `This student has answered ${studentFullAssignment.length} question(s) in this assignment. Here are all their answers for context:\n\n`;
      
      studentFullAssignment.forEach((qa: any, idx: number) => {
        studentFullAssignmentSection += `Question ${idx + 1}${qa.isCurrentQuestion ? ' (⭐ CURRENT - THE ONE TO GRADE)' : ''}:\n`;
        studentFullAssignmentSection += `Q: ${qa.questionText}\n`;
        studentFullAssignmentSection += `A: ${qa.answerText}\n\n`;
      });
    }

    // Build context with all answers (for calibration)
    let allAnswersContext = '';
    if (allAnswers && Array.isArray(allAnswers) && allAnswers.length > 0) {
      allAnswersContext = `## All Student Answers (for calibration):\n`;
      allAnswersContext += `There are ${allAnswers.length} total student(s) who submitted answers for this question:\n\n`;
      allAnswers.forEach((ans: any, idx: number) => {
        allAnswersContext += `Student ${idx + 1}: ${ans.answerText}\n\n`;
      });
    }

    // Build rubrics description
    const rubricsDescription = rubrics
      .map((rubric: any) => {
        const levelsDesc = rubric.levels
          .map((level: any, idx: number) => 
            `  Level ${idx}: ${level.name} (${level.percentage}%) - ${level.description}`
          )
          .join('\n');
        return `\nCriteria: ${rubric.criteriaName} (ID: ${rubric._id})\n${levelsDesc}`;
      })
      .join('\n');

    const userPrompt = `${assignmentContextSection}## Question to Grade:
${questionText}

## Rubrics:
${rubricsDescription}

${previousFeedbackSection}${allAnswersContext}${studentFullAssignmentSection}## ⭐ Current Student's Answer to Grade (for this question):
${currentAnswer.answerText}

Please evaluate this answer and suggest the appropriate level for each criteria. Return ONLY valid JSON.`;

    const completion = await openai.chat.completions.create({
      model: modelToUse,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    let responseText = completion.choices[0].message.content || '{}';
    console.log('OpenAI Raw Response:', responseText);
    
    // Strip markdown code blocks if present (some models wrap JSON in ```json ... ```)
    responseText = responseText.trim();
    if (responseText.startsWith('```json')) {
      responseText = responseText.replace(/^```json\s*\n?/, '').replace(/\n?```\s*$/, '');
      console.log('Stripped markdown code blocks');
    } else if (responseText.startsWith('```')) {
      responseText = responseText.replace(/^```\s*\n?/, '').replace(/\n?```\s*$/, '');
      console.log('Stripped markdown code blocks');
    }
    
    console.log('Cleaned Response:', responseText.substring(0, 100) + '...');
    const evaluation = JSON.parse(responseText);
    console.log('Parsed Evaluation:', evaluation);
    console.log('Suggestions:', evaluation.suggestions);

    // Validate that suggestions have the required feedback fields
    if (evaluation.suggestions && Array.isArray(evaluation.suggestions)) {
      evaluation.suggestions.forEach((suggestion: any, index: number) => {
        if (!suggestion.justification || suggestion.justification.trim() === '') {
          console.warn(`⚠️ Suggestion ${index} for rubric ${suggestion.rubricId} is missing justification!`);
        }
        if (!suggestion.improvementSuggestion || suggestion.improvementSuggestion.trim() === '') {
          console.warn(`⚠️ Suggestion ${index} for rubric ${suggestion.rubricId} is missing improvementSuggestion!`);
        }
        console.log(`✓ Suggestion ${index}:`, {
          rubricId: suggestion.rubricId,
          level: suggestion.suggestedLevelIndex,
          hasJustification: !!suggestion.justification,
          hasImprovement: !!suggestion.improvementSuggestion,
          justification: suggestion.justification?.substring(0, 50) + '...',
          improvement: suggestion.improvementSuggestion?.substring(0, 50) + '...'
        });
      });
    }

    return NextResponse.json({
      agentId,
      suggestions: evaluation.suggestions || [],
    });
  } catch (error: any) {
    console.error('POST /api/agent-suggest error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}

