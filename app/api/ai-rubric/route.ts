import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getOpenRouterClient, getDefaultModel } from '@/lib/openrouter';

interface RubricLevel {
  name: string;
  description: string;
  percentage: number;
}

interface CurrentRubric {
  criteriaName: string;
  levels: RubricLevel[];
}

interface RubricRequest {
  userPrompt: string;
  numberOfLevels?: number;
  conversationHistory?: Array<{ role: string; content: string }>;
  currentRubrics?: CurrentRubric[];
}

export async function POST(request: NextRequest) {
    try {
        await connectDB();
        const body: RubricRequest = await request.json();

        // Get OpenRouter client and settings
        const { client: openai, settings } = await getOpenRouterClient();

        // Build conversation messages
        const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
            {
                role: 'system',
                content: settings.aiSystemPrompt,
            },
        ];

        // Add conversation history if provided
        if (body.conversationHistory && body.conversationHistory.length > 0) {
            body.conversationHistory.forEach((msg) => {
                messages.push({
                    role: msg.role as 'system' | 'user' | 'assistant',
                    content: msg.content,
                });
            });
        }

    // Add the current user prompt
    let userMessage = body.userPrompt;
    
    // Include current rubrics if this is a refinement request
    if (body.currentRubrics && body.currentRubrics.length > 0) {
      userMessage = `I have the following existing rubrics that I want you to refine based on my request:\n\n`;
      userMessage += `CURRENT RUBRICS:\n${JSON.stringify(body.currentRubrics, null, 2)}\n\n`;
      userMessage += `USER REQUEST: ${body.userPrompt}\n\n`;
      userMessage += `Please refine these rubrics according to my request. Keep the same criteria unless I ask to add/remove them. Maintain the structure and improve based on my feedback.`;
    } else if (body.numberOfLevels) {
      userMessage += `\n\nPlease create rubrics with ${body.numberOfLevels} performance levels.`;
    }
    
    userMessage += `\n\nPlease respond with a JSON object in the following format:
{
  "rubrics": [
    {
      "criteriaName": "Criterion Name",
      "description": "Brief explanation of what this criterion assesses",
      "levels": [
        {
          "name": "Level Name (e.g., Excellent, Good, Fair, Poor)",
          "description": "Detailed description of performance at this level",
          "percentage": 100
        }
      ]
    }
  ],
  "explanation": "Overall explanation of the rubric design choices"
}

Important: The percentage values should be from 0-100 representing the percentage of points for this level of performance in this specific criterion. Typically, the highest level should be 100%, and lower levels should have progressively lower percentages.`;

        messages.push({
            role: 'user',
            content: userMessage,
        });

        // Call OpenRouter API
        const completion = await openai.chat.completions.create({
            model: getDefaultModel('rubric'),
            messages: messages,
            temperature: 0.7,
            response_format: { type: 'json_object' },
        });

        const responseContent = completion.choices[0]?.message?.content;

        if (!responseContent) {
            return NextResponse.json(
                { error: 'No response from AI' },
                { status: 500 }
            );
        }

        // Parse the JSON response
        const parsedResponse = JSON.parse(responseContent);

        // Return the AI-generated rubrics along with conversation history
        return NextResponse.json({
            rubrics: parsedResponse.rubrics || [],
            explanation: parsedResponse.explanation || '',
            conversationHistory: [
                ...messages.slice(1), // Exclude system prompt from history
                {
                    role: 'assistant',
                    content: responseContent,
                },
            ],
        });
    } catch (error: unknown) {
        console.error('AI Rubric generation error:', error);

        if (error instanceof Error) {
            // Handle OpenRouter API errors
            if ('status' in error && error.status === 401) {
                return NextResponse.json(
                    { error: 'Invalid OpenRouter API key. Please check your settings.' },
                    { status: 401 }
                );
            }

            return NextResponse.json(
                { error: `Failed to generate rubrics: ${error.message}` },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to generate rubrics' },
            { status: 500 }
        );
    }
}

