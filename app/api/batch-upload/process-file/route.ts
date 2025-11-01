import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getOpenRouterClient, getDefaultModel } from '@/lib/openrouter';
import { Question } from '@/models/Question';
import { Submission } from '@/models/Submission';
import { Answer } from '@/models/Answer';
import { BatchUpload } from '@/models/BatchUpload';
import OpenAI from 'openai';

// Helper to extract text from image using OpenRouter Vision
async function extractTextFromImage(file: File): Promise<string> {
  try {
    const { client: openai } = await getOpenRouterClient();
    
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
              text: 'Please extract all text from this image. Preserve the structure and formatting as much as possible. If this is a handwritten or typed exam/assignment submission, extract all the answers and questions visible.'
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
    
    return response.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('Image OCR error:', error);
    throw new Error('Failed to extract text from image using OCR');
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
    console.log('- First 500 chars:', fullText.substring(0, 500));
    console.log('- Last 500 chars:', fullText.substring(Math.max(0, fullText.length - 500)));
    
    if (!fullText || fullText.length < 50) {
      throw new Error('Extracted text is too short or empty - PDF may be scanned image or empty');
    }
    
    return fullText;
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper to extract student metadata (name and email) from text
async function extractStudentMetadata(text: string): Promise<{ name: string; email: string }> {
  try {
    const { client: openai } = await getOpenRouterClient();
    
    const response = await openai.chat.completions.create({
      model: getDefaultModel('extraction'),
      messages: [
        {
          role: 'system',
          content: `You are an expert at extracting student information from exam submissions. Extract the student's name and email address (or student ID if no email is present).`
        },
        {
          role: 'user',
          content: `From the following text, extract the student's name and email address (or ID).

TEXT:
${text.substring(0, 2000)}

Return ONLY a valid JSON object with this structure:
{
  "name": "Student Full Name",
  "email": "student@email.com or student_id"
}

If you cannot find the name, use "Unknown Student". If you cannot find an email or ID, use "no-email@unknown.com".`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 200,
    });
    
    const result = JSON.parse(response.choices[0]?.message?.content || '{}');
    return {
      name: result.name || 'Unknown Student',
      email: result.email || 'no-email@unknown.com',
    };
  } catch (error) {
    console.error('Metadata extraction error:', error);
    return {
      name: 'Unknown Student',
      email: 'no-email@unknown.com',
    };
  }
}

// Helper to parse submission and map to questions
async function parseSubmission(
  text: string,
  questions: any[]
): Promise<any[]> {
  try {
    const { client: openai } = await getOpenRouterClient();
    
    const questionsContext = questions.map((q) => ({
      questionId: q._id.toString(),
      questionNumber: q.questionNumber,
      questionText: q.questionText,
    }));
    
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

${text}

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
      temperature: 0.1,
      max_tokens: 16000, // Increased for longer submissions
    });
    
    const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
    
    if (!result.answers || !Array.isArray(result.answers)) {
      throw new Error('Invalid AI response format');
    }
    
    // Ensure all questions have an answer entry
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
    
    return completeAnswers;
  } catch (error) {
    console.error('Parse submission error:', error);
    throw error;
  }
}

// POST: Process a single file from batch upload
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const contentType = request.headers.get('content-type') || '';
    
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
    }
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const batchId = formData.get('batchId') as string;
    const fileIndex = parseInt(formData.get('fileIndex') as string);
    const assignmentId = formData.get('assignmentId') as string;
    
    if (!file || !batchId || fileIndex === undefined || !assignmentId) {
      return NextResponse.json(
        { error: 'Missing required parameters: file, batchId, fileIndex, assignmentId' },
        { status: 400 }
      );
    }
    
    // Get settings for OpenAI API key
    const settings = await Settings.findOne();
    if (!settings?.openaiApiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please configure it in Settings.' },
        { status: 400 }
      );
    }
    
    // Get batch upload record
    const batch = await BatchUpload.findById(batchId);
    if (!batch) {
      return NextResponse.json({ error: 'Batch upload not found' }, { status: 404 });
    }
    
    // Update file status to processing
    batch.files[fileIndex].status = 'processing';
    batch.files[fileIndex].startedAt = new Date();
    batch.files[fileIndex].currentStep = 'extracting_text';
    batch.files[fileIndex].progress = 10;
    batch.status = 'processing';
    await batch.save();
    
    try {
      // Step 1: Extract text from file
      console.log('=== EXTRACTING TEXT FROM FILE ===');
      console.log('File name:', file.name);
      console.log('File type:', file.type);
      console.log('File size:', file.size);
      
      let extractedText = '';
      const fileName = file.name.toLowerCase();
      const fileType = file.type.toLowerCase();
      
      if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
        extractedText = await extractTextFromPDF(file);
      } else if (fileType.startsWith('image/') || 
                 fileName.endsWith('.png') || 
                 fileName.endsWith('.jpg') || 
                 fileName.endsWith('.jpeg') || 
                 fileName.endsWith('.gif') || 
                 fileName.endsWith('.webp')) {
        extractedText = await extractTextFromImage(file);
      } else if (fileName.endsWith('.md') || fileName.endsWith('.markdown') || fileType === 'text/markdown') {
        extractedText = await file.text();
      } else if (fileType.startsWith('text/')) {
        extractedText = await file.text();
      } else {
        throw new Error('Unsupported file type');
      }
      
      console.log('=== TEXT EXTRACTION COMPLETE ===');
      console.log('Total extracted length:', extractedText.length);
      console.log('First 1000 chars:', extractedText.substring(0, 1000));
      console.log('Last 500 chars:', extractedText.substring(Math.max(0, extractedText.length - 500)));
      
      // Update progress: text extracted
      batch.files[fileIndex].currentStep = 'extracting_metadata';
      batch.files[fileIndex].progress = 30;
      await batch.save();
      
      // Step 2: Extract student metadata (name and email)
      const metadata = await extractStudentMetadata(extractedText);
      
      batch.files[fileIndex].studentName = metadata.name;
      batch.files[fileIndex].studentEmail = metadata.email;
      batch.files[fileIndex].progress = 50;
      await batch.save();
      
      // Step 3: Fetch questions for this assignment
      const questions = await Question.find({ assignmentId }).sort({ questionNumber: 1 });
      
      if (questions.length === 0) {
        throw new Error('No questions found for this assignment');
      }
      
      // Update progress: parsing answers
      batch.files[fileIndex].currentStep = 'parsing_answers';
      batch.files[fileIndex].progress = 60;
      await batch.save();
      
      // Step 4: Parse submission and map to questions
      let parsedAnswers;
      
      // SPECIAL CASE: If there's only ONE question, treat it as an essay
      // Use the entire text as the answer without AI parsing
      if (questions.length === 1) {
        console.log('=== SINGLE QUESTION DETECTED - ESSAY MODE (BATCH) ===');
        console.log('Using entire extracted text as answer for the single question');
        
        parsedAnswers = [{
          questionId: questions[0]._id.toString(),
          questionNumber: questions[0].questionNumber,
          questionText: questions[0].questionText,
          answerText: extractedText.trim(),
          confidence: 'high',
        }];
      } else {
        // Multiple questions: use AI to parse and map answers
        parsedAnswers = await parseSubmission(extractedText, questions);
      }
      
      // Update progress: creating submission
      batch.files[fileIndex].currentStep = 'creating_submission';
      batch.files[fileIndex].progress = 80;
      await batch.save();
      
      // Step 5: Create submission
      const submission = await Submission.create({
        assignmentId,
        studentName: metadata.name,
        studentEmail: metadata.email,
        batchUploadId: batchId,
        processingStatus: 'completed',
        extractedText: extractedText.substring(0, 10000), // Store first 10k chars
      });
      
      // Step 6: Create answers (skip empty answers)
      for (const answer of parsedAnswers) {
        // Skip if answer text is empty or whitespace only
        if (!answer.answerText || !answer.answerText.trim()) {
          console.log(`Skipping empty answer for question ${answer.questionId}`);
          continue;
        }
        
        await Answer.create({
          submissionId: submission._id,
          questionId: answer.questionId,
          answerText: answer.answerText.trim(),
        });
      }
      
      // Update batch: file completed
      batch.files[fileIndex].status = 'completed';
      batch.files[fileIndex].progress = 100;
      batch.files[fileIndex].completedAt = new Date();
      batch.files[fileIndex].submissionId = submission._id.toString();
      batch.completedFiles += 1;
      
      // Check if all files are done
      const allDone = batch.files.every(f => f.status === 'completed' || f.status === 'error');
      if (allDone) {
        batch.status = batch.failedFiles > 0 ? 'partial' : 'completed';
      }
      
      await batch.save();
      
      return NextResponse.json({
        success: true,
        submissionId: submission._id,
        studentName: metadata.name,
        studentEmail: metadata.email,
        parsedAnswers: parsedAnswers.length,
      });
      
    } catch (error) {
      // Update batch: file failed
      batch.files[fileIndex].status = 'error';
      batch.files[fileIndex].error = error instanceof Error ? error.message : 'Unknown error';
      batch.files[fileIndex].completedAt = new Date();
      batch.failedFiles += 1;
      
      // Check if all files are done
      const allDone = batch.files.every(f => f.status === 'completed' || f.status === 'error');
      if (allDone) {
        batch.status = batch.completedFiles > 0 ? 'partial' : 'failed';
      }
      
      await batch.save();
      
      throw error;
    }
    
  } catch (error) {
    console.error('Process file error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

