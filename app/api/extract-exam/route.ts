import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Settings } from '@/models/Settings';
import OpenAI from 'openai';

interface ExtractedQuestion {
  questionText: string;
  questionNumber: number;
  pointsPercentage: number;
  rubrics: ExtractedRubric[];
}

interface ExtractedRubric {
  criteriaName: string;
  levels: {
    name: string;
    description: string;
    percentage: number;
  }[];
}

// Helper function to extract text from PDF
async function extractFromPDF(file: File): Promise<string> {
  // Get settings for OpenAI API key
  const settings = await Settings.findOne();
  if (!settings || !settings.openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const openai = new OpenAI({
    apiKey: settings.openaiApiKey,
  });

  // Convert PDF to buffer for file upload
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Upload PDF to OpenAI
  const fileBlob = new Blob([buffer], { type: 'application/pdf' });
  const openaiFile = new File([fileBlob], file.name, { type: 'application/pdf' });
  
  const uploadedFile = await openai.files.create({
    file: openaiFile,
    purpose: 'assistants',
  });

  // Create a temporary assistant to read the PDF
  const assistant = await openai.beta.assistants.create({
    name: 'PDF Exam Extractor',
    instructions: `You are an expert at analyzing exam documents. Extract all text from the PDF, focusing on questions, point values, and any grading criteria or rubrics.`,
    model: 'gpt-4o-mini',
    tools: [{ type: 'file_search' }],
  });

  // Create a thread with the file
  const thread = await openai.beta.threads.create({
    messages: [
      {
        role: 'user',
        content: 'Please extract and read all text content from this exam PDF. Focus on identifying questions, their numbering, point values, and any rubrics or grading criteria.',
        attachments: [
          {
            file_id: uploadedFile.id,
            tools: [{ type: 'file_search' }],
          },
        ],
      },
    ],
  });

  // Run the assistant
  const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
    assistant_id: assistant.id,
  });

  // Get the extracted text
  let extractedText = '';
  if (run.status === 'completed') {
    const messages = await openai.beta.threads.messages.list(thread.id);
    const lastMessage = messages.data[0];
    if (lastMessage.content[0].type === 'text') {
      extractedText = lastMessage.content[0].text.value;
    }
  }

  // Clean up
  await openai.beta.assistants.delete(assistant.id);
  await openai.files.delete(uploadedFile.id);

  return extractedText;
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Check if this is a text/markdown submission or file upload
    const contentType = request.headers.get('content-type');
    let extractedText = '';

    if (contentType?.includes('application/json')) {
      // Handle direct text input
      const body = await request.json();
      if (!body.text || typeof body.text !== 'string') {
        return NextResponse.json(
          { error: 'No text provided' },
          { status: 400 }
        );
      }
      extractedText = body.text;
    } else {
      // Handle file upload (PDF or Markdown)
      const formData = await request.formData();
      const file = formData.get('file') as File;

      if (!file) {
        return NextResponse.json(
          { error: 'No file provided' },
          { status: 400 }
        );
      }

      // Check if file is PDF or Markdown
      const isMarkdown = file.type === 'text/markdown' || 
                        file.name.endsWith('.md') || 
                        file.name.endsWith('.markdown');
      const isPDF = file.type === 'application/pdf';

      if (!isPDF && !isMarkdown) {
        return NextResponse.json(
          { error: 'Only PDF and Markdown (.md) files are supported' },
          { status: 400 }
        );
      }

      if (isMarkdown) {
        // Read markdown file as text
        const text = await file.text();
        extractedText = text;
      } else {
        // Handle PDF file
        extractedText = await extractFromPDF(file);
      }
    }

    // Fetch settings to get API key
    const settings = await Settings.findOne();

    if (!settings || !settings.openaiApiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please add it in Settings.' },
        { status: 400 }
      );
    }

    if (!extractedText) {
      return NextResponse.json(
        { error: 'Failed to extract text from input' },
        { status: 500 }
      );
    }

    console.log('Extracted text:', extractedText.substring(0, 500));

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: settings.openaiApiKey,
    });

    // Use GPT to structure the questions and rubrics
    console.log('Structuring questions and rubrics...');
    const structureCompletion = await openai.chat.completions.create({
      model: 'gpt-5',
      messages: [
        {
          role: 'system',
          content: `You are an expert at analyzing exam documents and extracting structured information.
          
Your task is to analyze the provided exam text and extract:
1. All questions with their text and point values
2. Grading rubrics or criteria for each question (if available in the document)

Guidelines:
- Extract each question as a separate item
- If point values are given, calculate the percentage each question represents of the total
- If no point values are given, distribute points evenly
- Create basic rubrics if none are explicitly provided (use common assessment criteria)
- Each rubric should have 3-5 performance levels
- Ensure all percentages in questions sum to 100%
- Each rubric level's percentage should range from 0-100, where 100 is perfect performance`,
        },
        {
          role: 'user',
          content: `Here is the extracted exam content:

${extractedText}

Please analyze this and return a JSON object with the following structure:
{
  "questions": [
    {
      "questionText": "The full text of the question",
      "questionNumber": 1,
      "pointsPercentage": 25.0,
      "rubrics": [
        {
          "criteriaName": "Accuracy",
          "levels": [
            {
              "name": "Excellent",
              "description": "Answer is completely accurate and thorough",
              "percentage": 100
            },
            {
              "name": "Good",
              "description": "Answer is mostly accurate with minor issues",
              "percentage": 75
            },
            {
              "name": "Fair",
              "description": "Answer has some accuracy but significant gaps",
              "percentage": 50
            },
            {
              "name": "Poor",
              "description": "Answer is largely inaccurate or incomplete",
              "percentage": 25
            }
          ]
        }
      ]
    }
  ],
  "totalPoints": 100,
  "summary": "Brief summary of the exam structure"
}

IMPORTANT: 
- The sum of all question pointsPercentage values MUST equal 100
- Each rubric level percentage should be 0-100 (not cumulative)
- Include at least one rubric per question
- If the document has explicit rubrics, use those; otherwise create appropriate ones`,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const responseContent = structureCompletion.choices[0]?.message?.content;

    if (!responseContent) {
      return NextResponse.json(
        { error: 'Failed to structure exam data' },
        { status: 500 }
      );
    }

    // Parse the JSON response
    const structuredData = JSON.parse(responseContent);

    console.log('Structured data:', JSON.stringify(structuredData, null, 2));

    // Validate the data
    if (!structuredData.questions || !Array.isArray(structuredData.questions)) {
      return NextResponse.json(
        { error: 'Invalid response format from AI' },
        { status: 500 }
      );
    }

    // Return the structured data
    return NextResponse.json({
      questions: structuredData.questions,
      totalPoints: structuredData.totalPoints || 100,
      summary: structuredData.summary || 'Exam extracted successfully',
    });
  } catch (error: unknown) {
    console.error('PDF extraction error:', error);

    if (error instanceof Error) {
      // Handle OpenAI API errors
      if ('status' in error && (error as any).status === 401) {
        return NextResponse.json(
          { error: 'Invalid OpenAI API key. Please check your settings.' },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: `Failed to extract exam: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to extract exam data' },
      { status: 500 }
    );
  }
}

