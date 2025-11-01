import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getOpenRouterClient, getDefaultModel } from '@/lib/openrouter';
import { Question } from '@/models/Question';
import OpenAI from 'openai';

// Helper to clean AI meta-commentary from extracted text
function cleanAIMetaText(text: string): string {
  // Remove common AI meta-text patterns
  const patterns = [
    /^Here is the extracted text( content)?.*?:\s*/i,
    /^This is the extracted( text)? content.*?:\s*/i,
    /^The extracted text is as follows.*?:\s*/i,
    /^---+\s*/gm, // Remove markdown separators
    /This includes all answers.*$/i,
    /^Below is the( extracted)? text.*?:\s*/i,
    /^I('ve| have) extracted.*?:\s*/i,
    /preserving( the)? structure and formatting.*$/im,
  ];
  
  let cleaned = text;
  for (const pattern of patterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Trim excessive whitespace
  cleaned = cleaned.trim();
  
  return cleaned;
}

// Helper to extract student info from text
function extractStudentInfo(text: string): { name: string; email: string } {
  let name = '';
  let email = '';
  
  // Look for email patterns
  const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch) {
    email = emailMatch[1];
  }
  
  // Look for ID patterns (like G202421440)
  const idMatch = text.match(/([A-Z]\d{9})/);
  if (idMatch) {
    email = idMatch[1]; // Use ID as email if no email found
  }
  
  // Look for name patterns (usually at the top of the document)
  // Try to find a name before a newline or ID/date
  const namePatterns = [
    // Name followed by ID or date on same or next line
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)(?:\s+[A-Z]\d{9}|\s+\d{1,2}\/\d{1,2}\/\d{4})/m,
    // Name on its own line near the top
    /^([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*$/m,
  ];
  
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match) {
      name = match[1].trim();
      break;
    }
  }
  
  return { name, email };
}

// Helper to extract text from images using OpenRouter Vision
async function extractTextFromImage(file: File): Promise<string> {
  try {
    const { client: openai } = await getOpenRouterClient();
    
    // Convert image to base64
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const mimeType = file.type || 'image/png';
    
    const response = await openai.chat.completions.create({
      model: getDefaultModel('vision'),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract all text from this image. Return ONLY the actual text content without any commentary. Do NOT add phrases like "Here is the extracted text" or explanations. Just return the raw text exactly as it appears in the image.'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
              }
            }
          ]
        }
      ],
      max_tokens: 4096,
    });
    
    let extractedText = response.choices[0]?.message?.content || '';
    
    // Clean up AI meta-commentary
    extractedText = cleanAIMetaText(extractedText);
    
    return extractedText;
  } catch (error) {
    console.error('Image OCR error:', error);
    throw new Error('Failed to extract text from image using vision model');
  }
}

// Helper to extract text from PDF using unpdf (Next.js compatible!)
async function extractTextFromPDF(file: File): Promise<string> {
  try {
    console.log('Extracting text from PDF:', file.name);
    
    // Import unpdf - works perfectly in Next.js
    const { extractText } = await import('unpdf');
    
    // Convert File to ArrayBuffer
    const bytes = await file.arrayBuffer();
    
    // Extract text using unpdf
    const { text, totalPages } = await extractText(bytes);
    
    // unpdf returns text as array of pages - join them
    const fullText = Array.isArray(text) ? text.join('\n\n') : String(text);
    
    console.log('PDF extraction complete:');
    console.log('- Pages:', totalPages);
    console.log('- Text length:', fullText.length);
    
    if (!fullText || fullText.length < 50) {
      throw new Error('Extracted text is too short or empty - PDF may be scanned image or empty');
    }
    
    return fullText;
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    // Get settings for OpenAI API key
    const settings = await Settings.findOne();
    if (!settings?.openaiApiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please configure it in Settings.' },
        { status: 400 }
      );
    }
    
    const contentType = request.headers.get('content-type') || '';
    let extractedText = '';
    let assignmentId = '';
    let mode = 'text'; // text, file
    
    if (contentType.includes('multipart/form-data')) {
      // File upload (PDF, image, or markdown file)
      const formData = await request.formData();
      const file = formData.get('file') as File;
      assignmentId = formData.get('assignmentId') as string;
      
      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }
      
      const fileName = file.name.toLowerCase();
      const fileType = file.type.toLowerCase();
      
      // Determine file type and extract text accordingly
      if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
        // PDF file - use direct PDF parser (fast and free!)
        extractedText = await extractTextFromPDF(file);
        mode = 'file';
      } else if (fileType.startsWith('image/') || 
                 fileName.endsWith('.png') || 
                 fileName.endsWith('.jpg') || 
                 fileName.endsWith('.jpeg') || 
                 fileName.endsWith('.gif') || 
                 fileName.endsWith('.webp')) {
        // Image file - use Vision API for OCR
        extractedText = await extractTextFromImage(file);
        mode = 'file';
      } else if (fileName.endsWith('.md') || fileName.endsWith('.markdown') || fileType === 'text/markdown') {
        // Markdown file - read as text
        extractedText = await file.text();
        mode = 'file';
      } else if (fileType.startsWith('text/')) {
        // Text file
        extractedText = await file.text();
        mode = 'file';
      } else {
        return NextResponse.json(
          { error: 'Unsupported file type. Please upload PDF, image, markdown, or text files.' },
          { status: 400 }
        );
      }
    } else {
      // JSON request with pasted text or markdown
      const body = await request.json();
      extractedText = body.text || body.markdown || '';
      assignmentId = body.assignmentId;
      mode = 'text';
    }
    
    if (!extractedText.trim()) {
      return NextResponse.json(
        { error: 'No text could be extracted from the input' },
        { status: 400 }
      );
    }
    
    if (!assignmentId) {
      return NextResponse.json({ error: 'Assignment ID is required' }, { status: 400 });
    }
    
    // Fetch all questions for this assignment
    const questions = await Question.find({ assignmentId }).sort({ questionNumber: 1 });
    
    if (questions.length === 0) {
      return NextResponse.json(
        { error: 'No questions found for this assignment' },
        { status: 400 }
      );
    }
    
    // Prepare questions context for AI
    const questionsContext = questions.map((q, idx) => ({
      questionId: q._id.toString(),
      questionNumber: q.questionNumber,
      questionText: q.questionText,
    }));
    
    console.log('=== PARSING SUBMISSION ===');
    console.log('Assignment ID:', assignmentId);
    console.log('Number of questions:', questions.length);
    console.log('Questions:', questionsContext);
    console.log('Extracted text length:', extractedText.length);
    console.log('Extracted text preview:', extractedText.substring(0, 500));
    
    // SPECIAL CASE: If there's only ONE question, treat it as an essay
    // Extract the entire text as the answer without AI parsing
    if (questions.length === 1) {
      console.log('=== SINGLE QUESTION DETECTED - ESSAY MODE ===');
      console.log('Using entire extracted text as answer for the single question');
      
      // Extract student info from the text
      const studentInfo = extractStudentInfo(extractedText);
      console.log('Extracted student info:', studentInfo);
      
      const singleAnswer = {
        questionId: questionsContext[0].questionId,
        questionNumber: questionsContext[0].questionNumber,
        questionText: questionsContext[0].questionText,
        answerText: extractedText.trim(),
        confidence: 'high',
      };
      
      return NextResponse.json({
        success: true,
        answers: [singleAnswer],
        summary: `Essay submission captured (${extractedText.length} characters)`,
        warnings: [],
        extractedText: extractedText.substring(0, 2000) + (extractedText.length > 2000 ? '...' : ''),
        studentName: studentInfo.name,
        studentEmail: studentInfo.email,
      });
    }
    
    // Use OpenRouter to parse and map the text to questions (for multi-question assignments)
    const { client: openai } = await getOpenRouterClient();
    
    const systemPrompt = `You are an expert at parsing student exam/assignment submissions and mapping answers to specific questions.

Your task:
1. Carefully analyze the provided submission text
2. Match each part of the submission to the corresponding question from the provided list
3. Extract the complete answer for each question
4. Assign a confidence score based on how certain the match is

MATCHING STRATEGY (in order of priority):
1. **Question Numbers**: Look for explicit question numbers (e.g., "Question 1:", "Q1:", "1.", "1)", etc.)
2. **Keywords**: Match keywords from the question text to content in the submission
3. **Semantic Similarity**: Understand the meaning of both question and answer to find matches
4. **Context Clues**: Use surrounding text and structure to infer which answer belongs to which question
5. **Sequential Order**: If no other clues, assume answers are in the same order as questions

CONFIDENCE LEVELS:
- **high**: Question number explicitly mentioned OR very clear semantic match
- **medium**: Good keyword match OR reasonable semantic similarity
- **low**: Weak match OR guessing based on order/context
- If NO answer found at all, still include the question with empty answerText and confidence "low"

EXTRACTION RULES:
- Extract the COMPLETE answer - don't truncate or summarize
- Preserve the student's original wording and formatting
- Include all relevant details, examples, and explanations
- If an answer spans multiple paragraphs, include all of them
- Don't add your own commentary or corrections`;

    const userPrompt = `ASSIGNMENT QUESTIONS (These are the questions the student is answering):

${questionsContext.map(q => `Question ${q.questionNumber} (ID: ${q.questionId}):
${q.questionText}`).join('\n\n')}

==========================================

STUDENT SUBMISSION (Extract answers from this text):

${extractedText}

==========================================

INSTRUCTIONS:
Carefully read both the questions and the student's submission. For each question listed above, find the corresponding answer in the student's submission and extract it completely.

Return ONLY a valid JSON object (no markdown, no code blocks) with this EXACT structure:
{
  "answers": [
    {
      "questionId": "exact_question_id_from_above",
      "answerText": "the complete extracted answer text here",
      "confidence": "high|medium|low"
    }
  ],
  "summary": "Brief summary like: 'Extracted 3/4 answers with high confidence'",
  "warnings": ["List any issues like: 'Could not find answer for Question 2'"]
}

IMPORTANT: 
- Include an entry for EVERY question, even if no answer is found (use empty string for answerText)
- Use the exact questionId values provided above
- Ensure the JSON is valid and parseable`;

    const completion = await openai.chat.completions.create({
      model: getDefaultModel('extraction'),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1, // Lower temperature for more consistent parsing
      max_tokens: 8192, // Increased for longer submissions
    });
    
    const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
    
    console.log('=== AI PARSING RESULT ===');
    console.log('Result:', JSON.stringify(result, null, 2));
    
    // Validate the result
    if (!result.answers || !Array.isArray(result.answers)) {
      console.error('Invalid AI response format:', result);
      return NextResponse.json(
        { error: 'AI failed to parse the submission properly' },
        { status: 500 }
      );
    }
    
    // Ensure all questions have an answer entry (even if empty)
    const answersMap = new Map(result.answers.map((a: any) => [a.questionId, a]));
    const completeAnswers = questionsContext.map(q => {
      const existing = answersMap.get(q.questionId);
      return {
        questionId: q.questionId,
        questionNumber: q.questionNumber,
        questionText: q.questionText,
        answerText: existing?.answerText || '',
        confidence: existing?.confidence || 'low',
      };
    });
    
    console.log('=== COMPLETE ANSWERS ===');
    console.log('Complete answers:', completeAnswers);
    
    // Extract student info from the text
    const studentInfo = extractStudentInfo(extractedText);
    console.log('Extracted student info:', studentInfo);
    
    return NextResponse.json({
      success: true,
      answers: completeAnswers,
      summary: result.summary || `Parsed ${completeAnswers.filter((a: any) => a.answerText).length} of ${questions.length} answers`,
      warnings: result.warnings || [],
      extractedText: extractedText.substring(0, 2000) + (extractedText.length > 2000 ? '...' : ''), // Show more context
      studentName: studentInfo.name,
      studentEmail: studentInfo.email,
    });
    
  } catch (error) {
    console.error('Parse submission error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to parse submission',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

