import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Settings } from '@/models/Settings';

export async function GET() {
    try {
        await connectDB();
        let settings = await Settings.findOne();

        const defaultGradingAgentPrompt = `You are an expert grading assistant. Your task is to evaluate a student's answer based on the provided rubrics.

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

        // If no settings exist, create default settings
        if (!settings) {
            settings = await Settings.create({
                openaiApiKey: '',
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
                await settings.save();
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
            existingSettings.openaiApiKey = body.openaiApiKey;
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

        settings.openaiApiKey = body.openaiApiKey;
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

