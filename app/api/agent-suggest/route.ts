import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Settings } from '@/models/Settings';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Get OpenAI API key from settings
    const settings = await Settings.findOne();
    if (!settings || !settings.openaiApiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please set it in Settings.' },
        { status: 400 }
      );
    }

    const openai = new OpenAI({
      apiKey: settings.openaiApiKey,
    });

    const body = await request.json();
    const { agentId, questionText, currentAnswer, allAnswers, rubrics } = body;

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
2. justification - a 1-2 sentence explanation of WHY you chose this level (written in SECOND PERSON, speaking directly to the student)
3. improvementSuggestion - a 1 sentence suggestion on how the student can improve (written in SECOND PERSON, speaking directly to the student)

IMPORTANT: 
- The justification and improvementSuggestion fields are REQUIRED and must not be empty.
- Write ALL feedback in SECOND PERSON (use "you", "your") as if speaking directly to the student.
- DO NOT use third person ("the student", "they", "their").

Example of correct output:
{
  "suggestions": [
    {
      "rubricId": "abc123",
      "suggestedLevelIndex": 1,
      "justification": "You demonstrate basic understanding of the concept but your analysis lacks depth.",
      "improvementSuggestion": "Consider providing specific examples to strengthen your argument."
    }
  ]
}

Steps:
1. Read the question and student's answer carefully
2. For each rubric criteria, evaluate the answer against each level
3. Select the most appropriate level
4. Write a clear justification in SECOND PERSON explaining your choice (e.g., "You showed...", "Your answer...")
5. Write a helpful suggestion for improvement in SECOND PERSON (e.g., "Try to...", "You could...")
6. Consider all student answers for calibration

Return ONLY valid JSON with the exact structure shown above. All fields are required.`;

    // Use the custom grading agent prompt from settings, or default if not set
    const systemPrompt = settings.gradingAgentPrompt || defaultPrompt;
    
    console.log('Using prompt:', settings.gradingAgentPrompt ? 'CUSTOM from settings' : 'DEFAULT with feedback');
    console.log('Prompt length:', systemPrompt.length);

    // Build context with all answers (for calibration)
    let allAnswersContext = '';
    if (allAnswers && Array.isArray(allAnswers) && allAnswers.length > 0) {
      allAnswersContext = '\n\n### All Student Answers (for calibration):\n';
      allAnswers.forEach((ans: any, idx: number) => {
        allAnswersContext += `\nStudent ${idx + 1}: ${ans.answerText}\n`;
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

    const userPrompt = `## Question:
${questionText}

## Rubrics:
${rubricsDescription}
${allAnswersContext}

## Current Student's Answer to Grade:
${currentAnswer.answerText}

Please evaluate this answer and suggest the appropriate level for each criteria. Return ONLY valid JSON.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0].message.content || '{}';
    console.log('OpenAI Raw Response:', responseText);
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

