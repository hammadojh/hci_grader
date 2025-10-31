import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Settings } from '@/models/Settings';

export async function GET() {
    try {
        await connectDB();
        let settings = await Settings.findOne();

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
            });
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
        await settings.save();

        return NextResponse.json(settings);
    } catch (error) {
        console.error('Settings PUT error:', error);
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }
}

