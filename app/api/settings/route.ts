import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Settings } from '@/models/Settings';

export async function GET() {
    try {
        await connectDB();
        let settings = await Settings.findOne();

        const defaultGradingAgentPrompt = `You are an expert grading assistant. Your task is to evaluate a student's answer based on the provided rubrics.

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

        // If no settings exist, create default settings
        if (!settings) {
      settings = await Settings.create({
        openaiApiKey: '', // Optional
        openRouterApiKey: '', // Will need to be configured by user
        defaultModel1: 'openai/gpt-5',
        defaultModel2: 'google/gemini-2.5-pro',
        defaultModel3: 'anthropic/claude-4.5-sonnet',
                aiSystemPrompt: `You are an expert educational assessment designer. Your role is to help instructors create comprehensive, fair, and well-structured rubrics for grading assignments.

When creating rubrics:
1. Consider the learning objectives and what skills/knowledge are being assessed
2. Create clear, measurable criteria that avoid ambiguity
3. Define distinct performance levels with specific descriptors
4. Assign appropriate weights based on the importance of each criterion
5. Use language that is clear to both instructors and students
6. Ensure the rubric promotes consistency in grading

For each criterion, provide:
- A clear name that identifies what is being assessed
- Multiple performance levels (typically 3-5 levels)
- Specific, observable descriptions for each level
- Percentage weights that reflect the relative importance

Always aim for rubrics that are practical, fair, and promote learning.`,
                gradingAgentPrompt: defaultGradingAgentPrompt,
                extractRubrics: true,
                splitIntoQuestions: true,
                extractionContext: '',
            });
        } else {
            // Ensure gradingAgentPrompt exists (for existing settings documents)
            if (!settings.gradingAgentPrompt) {
                settings.gradingAgentPrompt = defaultGradingAgentPrompt;
            }
            // Ensure default models exist
      if (!settings.defaultModel1) {
        settings.defaultModel1 = 'openai/gpt-5';
      }
      if (!settings.defaultModel2) {
        settings.defaultModel2 = 'google/gemini-2.5-pro';
      }
      if (!settings.defaultModel3) {
        settings.defaultModel3 = 'anthropic/claude-4.5-sonnet';
      }
            // Ensure extraction settings exist with defaults
            if (settings.extractRubrics === undefined) {
                settings.extractRubrics = true;
            }
            if (settings.splitIntoQuestions === undefined) {
                settings.splitIntoQuestions = true;
            }
            if (settings.extractionContext === undefined) {
                settings.extractionContext = '';
            }
            await settings.save();
        }

        return NextResponse.json(settings);
    } catch (error) {
        console.error('Settings GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        await connectDB();
        const body = await request.json();

        // Check if settings already exist
        const existingSettings = await Settings.findOne();

        if (existingSettings) {
            // Update existing settings
            if (body.openaiApiKey !== undefined) {
                existingSettings.openaiApiKey = body.openaiApiKey;
            }
            if (body.openRouterApiKey !== undefined) {
                existingSettings.openRouterApiKey = body.openRouterApiKey;
            }
            if (body.defaultModel1 !== undefined) {
                existingSettings.defaultModel1 = body.defaultModel1;
            }
            if (body.defaultModel2 !== undefined) {
                existingSettings.defaultModel2 = body.defaultModel2;
            }
            if (body.defaultModel3 !== undefined) {
                existingSettings.defaultModel3 = body.defaultModel3;
            }
            existingSettings.aiSystemPrompt = body.aiSystemPrompt;
            if (body.gradingAgentPrompt) {
                existingSettings.gradingAgentPrompt = body.gradingAgentPrompt;
            }
            if (body.extractRubrics !== undefined) {
                existingSettings.extractRubrics = body.extractRubrics;
            }
            if (body.splitIntoQuestions !== undefined) {
                existingSettings.splitIntoQuestions = body.splitIntoQuestions;
            }
            if (body.extractionContext !== undefined) {
                existingSettings.extractionContext = body.extractionContext;
            }
            await existingSettings.save();
            return NextResponse.json(existingSettings);
        } else {
            // Create new settings
            const settings = await Settings.create(body);
            return NextResponse.json(settings, { status: 201 });
        }
    } catch (error) {
        console.error('Settings POST error:', error);
        return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        await connectDB();
        const body = await request.json();

        const settings = await Settings.findOne();
        if (!settings) {
            return NextResponse.json({ error: 'Settings not found' }, { status: 404 });
        }

        if (body.openaiApiKey !== undefined) {
            settings.openaiApiKey = body.openaiApiKey;
        }
        if (body.openRouterApiKey !== undefined) {
            settings.openRouterApiKey = body.openRouterApiKey;
        }
        if (body.defaultModel1 !== undefined) {
            settings.defaultModel1 = body.defaultModel1;
        }
        if (body.defaultModel2 !== undefined) {
            settings.defaultModel2 = body.defaultModel2;
        }
        if (body.defaultModel3 !== undefined) {
            settings.defaultModel3 = body.defaultModel3;
        }
        settings.aiSystemPrompt = body.aiSystemPrompt;
        if (body.gradingAgentPrompt) {
            settings.gradingAgentPrompt = body.gradingAgentPrompt;
        }
        if (body.extractRubrics !== undefined) {
            settings.extractRubrics = body.extractRubrics;
        }
        if (body.splitIntoQuestions !== undefined) {
            settings.splitIntoQuestions = body.splitIntoQuestions;
        }
        if (body.extractionContext !== undefined) {
            settings.extractionContext = body.extractionContext;
        }
        await settings.save();

        return NextResponse.json(settings);
    } catch (error) {
        console.error('Settings PUT error:', error);
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }
}

