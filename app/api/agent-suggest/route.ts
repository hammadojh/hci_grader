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

    // Build a comprehensive prompt for the AI
    const systemPrompt = `You are an expert grading assistant. Your task is to evaluate a student's answer based on the provided rubrics.

For each criteria in the rubric, you must select the most appropriate level based on the student's answer quality.

You should:
1. Carefully read the question and the student's answer
2. Compare the answer against each rubric criteria
3. Select the level that best matches the answer's quality for each criteria
4. Consider all answers from other students for context (to calibrate your grading)

Return your evaluation as a JSON object with the following structure:
{
  "suggestions": [
    {
      "rubricId": "rubric_id_here",
      "suggestedLevelIndex": 0
    }
  ]
}

Be objective and consistent in your evaluation.`;

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
    const evaluation = JSON.parse(responseText);

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

