import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getOpenRouterClient, getDefaultModel } from '@/lib/openrouter';
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
  // Note: PDF extraction uses OpenAI Assistants API which requires direct OpenAI
  // OpenRouter doesn't support the Assistants API, so we use direct OpenAI here
  const { settings } = await getOpenRouterClient();
  
  // For PDF, we still need direct OpenAI API for Assistants
  if (!settings.openaiApiKey) {
    throw new Error('OpenAI API key required for PDF extraction. OpenRouter does not support Assistants API.');
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
    let extractRubrics = true;
    let splitIntoQuestions = true;
    let customContext = '';

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
      // Get extraction options from JSON body
      if (body.extractRubrics !== undefined) extractRubrics = body.extractRubrics;
      if (body.splitIntoQuestions !== undefined) splitIntoQuestions = body.splitIntoQuestions;
      if (body.customContext) customContext = body.customContext;
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

      // Get extraction options from FormData
      const extractRubricsParam = formData.get('extractRubrics');
      const splitIntoQuestionsParam = formData.get('splitIntoQuestions');
      const customContextParam = formData.get('customContext');
      
      if (extractRubricsParam !== null) extractRubrics = extractRubricsParam === 'true';
      if (splitIntoQuestionsParam !== null) splitIntoQuestions = splitIntoQuestionsParam === 'true';
      if (customContextParam) customContext = customContextParam as string;

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

    // Get OpenRouter client for exam structuring
    const { client: openai, settings } = await getOpenRouterClient();

    if (!extractedText) {
      return NextResponse.json(
        { error: 'Failed to extract text from input' },
        { status: 500 }
      );
    }

    console.log('Extracted text:', extractedText.substring(0, 500));

    // Build dynamic prompt based on options
    let systemPrompt = `You are an expert at analyzing exam documents and extracting structured information.`;
    
    if (customContext) {
      systemPrompt += `\n\nAdditional Context from User:\n${customContext}`;
    }

    systemPrompt += `\n\nYour task is to analyze the provided exam text and extract:`;
    
    if (splitIntoQuestions) {
      systemPrompt += `\n1. All questions with their text and point values (split into separate questions)`;
    } else {
      systemPrompt += `\n1. The actual assignment/question that students need to answer (as a single question)
   - ONLY extract the core question or assignment prompt that students are expected to respond to
   - EXCLUDE all instructions, submission guidelines, grading criteria, rubrics, course policies, or administrative content
   - Focus on identifying what the student is being asked to do or answer
   - The extracted question should be clear and self-contained`;
    }
    
    if (extractRubrics) {
      systemPrompt += `\n2. Grading rubrics or criteria for each question`;
    }

    systemPrompt += `\n\nGuidelines:`;
    
    if (splitIntoQuestions) {
      systemPrompt += `
- Extract each question as a separate item
- If point values are given, calculate the percentage each question represents of the total
- If no point values are given, distribute points evenly
- Ensure all percentages in questions sum to 100%`;
    } else {
      systemPrompt += `
- Identify and extract ONLY the core assignment question or prompt
- Ignore administrative sections like: submission instructions, formatting requirements, late policies, grading rubrics listed separately, course information
- The extracted question should be what students need to answer/complete
- Set pointsPercentage to 100 for the single question
- Be concise but include all essential information for understanding what is being asked`;
    }
    
    if (extractRubrics) {
      systemPrompt += `
- Create rubrics for assessment (use document rubrics if available, otherwise create appropriate ones)
- Each rubric should have 3-5 performance levels
- Each rubric level's percentage should range from 0-100, where 100 is perfect performance`;
    } else {
      systemPrompt += `
- Do not create or include any rubrics in the response
- Set the rubrics array to empty []`;
    }

    let userPrompt = `Here is the extracted exam content:\n\n${extractedText}\n\nPlease analyze this and return a JSON object with the following structure:\n{`;
    
    if (splitIntoQuestions) {
      userPrompt += `
  "questions": [
    {
      "questionText": "The full text of the question",
      "questionNumber": 1,
      "pointsPercentage": 25.0,`;
      
      if (extractRubrics) {
        userPrompt += `
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
      ]`;
      } else {
        userPrompt += `
      "rubrics": []`;
      }
      
      userPrompt += `
    }
  ],`;
    } else {
      userPrompt += `
  "questions": [
    {
      "questionText": "The extracted core assignment question or prompt that students need to answer (excluding all instructions, guidelines, and administrative content)",
      "questionNumber": 1,
      "pointsPercentage": 100.0,`;
      
      if (extractRubrics) {
        userPrompt += `
      "rubrics": [
        {
          "criteriaName": "Overall Quality",
          "levels": [
            {
              "name": "Excellent",
              "description": "Comprehensive and accurate response",
              "percentage": 100
            },
            {
              "name": "Good",
              "description": "Mostly complete with minor issues",
              "percentage": 75
            },
            {
              "name": "Fair",
              "description": "Partial understanding demonstrated",
              "percentage": 50
            },
            {
              "name": "Poor",
              "description": "Incomplete or inaccurate response",
              "percentage": 25
            }
          ]
        }
      ]`;
      } else {
        userPrompt += `
      "rubrics": []`;
      }
      
      userPrompt += `
    }
  ],`;
    }
    
    userPrompt += `
  "totalPoints": 100,
  "summary": "Brief summary of the exam structure"
}

IMPORTANT:`;
    
    if (splitIntoQuestions) {
      userPrompt += `
- The sum of all question pointsPercentage values MUST equal 100`;
    }
    
    if (extractRubrics) {
      userPrompt += `
- Each rubric level percentage should be 0-100 (not cumulative)
- Include at least one rubric per question if rubrics are requested`;
    } else {
      userPrompt += `
- Set rubrics to an empty array [] for each question`;
    }

    // Use OpenRouter to structure the questions and rubrics
    console.log('Structuring questions and rubrics...');
    const structureCompletion = await openai.chat.completions.create({
      model: getDefaultModel('extraction'),
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
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
      // Handle API errors
      if ('status' in error && (error as any).status === 401) {
        return NextResponse.json(
          { error: 'Invalid API key. Please check your settings.' },
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

