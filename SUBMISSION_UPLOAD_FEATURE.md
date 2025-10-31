# Student Submission Upload Feature

## Overview

This feature allows instructors to upload student submissions in multiple formats (PDF, images with OCR, text, markdown) and have them automatically parsed by AI to extract and map answers to the assignment's questions.

## Features

### Multiple Input Formats
1. **File Upload**: 
   - PDF documents
   - Images (PNG, JPG, JPEG, GIF, WebP) with OCR capability
   - Markdown files (.md, .markdown)
   - Text files

2. **Text Paste**: Direct text paste for quick entry

3. **Markdown Paste**: Structured markdown content

### AI-Powered Parsing

The system uses OpenAI's GPT-4o model to:
- Extract text from uploaded files
- Perform OCR on images using GPT-4o Vision API
- Intelligently match student answers to assignment questions
- Provide confidence levels (high/medium/low) for each parsed answer
- Generate warnings if answers couldn't be confidently matched

## How to Use

### Step 1: Navigate to Assignment

1. Go to the assignment detail page
2. Click on the "Submissions & Grading" tab
3. Click "+ Add Submission" button

### Step 2: Enter Student Information

1. Enter the student's name
2. Enter the student's email address

### Step 3: Choose Input Method

You'll see two options:
- **✏️ Type Manually**: Traditional method where you type each answer manually
- **📤 Upload / Paste (AI Parsing)**: AI-powered upload feature

### Step 4: Upload/Paste Submission (AI Parsing Mode)

If you choose "Upload / Paste (AI Parsing)", you have three sub-options:

#### Option A: Upload File (📁)
1. Click "Upload File" tab
2. Click on the upload area or drag and drop your file
3. Supported formats:
   - **PDF**: The system will extract text from the PDF
   - **Images**: The system uses OCR (Optical Character Recognition) to read handwritten or typed text
   - **Markdown**: Direct parsing of markdown files
   - **Text files**: Direct text extraction

#### Option B: Paste Text (📝)
1. Click "Paste Text" tab
2. Paste the student's submission text directly into the text area
3. The text should ideally include question numbers for better matching
4. Example format:
```
Question 1: UX design focuses on user experience and usability...
Question 2: The design thinking process includes five stages...
```

#### Option C: Paste Markdown (📋)
1. Click "Paste Markdown" tab
2. Paste markdown-formatted content
3. Example format:
```markdown
# Question 1
UX design focuses on user experience and usability...

# Question 2
The design thinking process includes five stages...
```

### Step 5: Parse with AI

1. After uploading a file or pasting text, click the "🤖 Parse Submission with AI" button
2. Wait while the AI processes the submission (this may take 10-30 seconds)
3. The system will:
   - Extract text from the file (including OCR for images)
   - Analyze the content
   - Match answers to questions
   - Display confidence levels

### Step 6: Review Parsed Answers

After parsing, you'll see:
- ✅ Success message with parsing summary
- ⚠️ Any warnings (e.g., "Could not find answer for Question 3")
- All questions with their parsed answers pre-filled
- Confidence indicators:
  - **Green (high confidence)**: Answer was clearly matched to the question
  - **Yellow (medium confidence)**: Answer was matched with some uncertainty
  - **Red (low confidence)**: Answer matching was uncertain
  - **Gray (no answer found)**: No answer could be identified for this question

### Step 7: Edit and Submit

1. Review all parsed answers
2. Edit any answers that need correction
3. Fill in any missing answers (marked with "no answer found")
4. Click "Create Submission" to save

## Technical Details

### API Endpoint: `/api/parse-submission`

**Request Methods:**
- `POST` with `multipart/form-data` for file uploads
- `POST` with JSON for text/markdown input

**Request Body (File Upload):**
```
FormData:
  - file: File (PDF, image, markdown, or text)
  - assignmentId: string
```

**Request Body (Text/Markdown):**
```json
{
  "text": "student submission text here",
  "assignmentId": "assignment_id_here"
}
```

**Response:**
```json
{
  "success": true,
  "answers": [
    {
      "questionId": "question_id",
      "questionNumber": 1,
      "questionText": "What is UX design?",
      "answerText": "extracted answer text",
      "confidence": "high|medium|low"
    }
  ],
  "summary": "Parsed 3 of 3 answers",
  "warnings": ["Any warnings here"],
  "extractedText": "first 1000 chars of extracted text"
}
```

### OCR Implementation

For image files, the system uses OpenAI's GPT-4o Vision API:
1. Converts the image to base64
2. Sends it to GPT-4o with a prompt to extract all visible text
3. The model can handle:
   - Handwritten text
   - Typed text
   - Mixed handwriting and print
   - Multiple languages
   - Various image qualities

### PDF Processing

For PDF files, the system:
1. Reads the PDF content
2. Uses OpenAI GPT-4o to extract and interpret the text
3. Handles both text-based PDFs and scanned PDFs (via OCR)

### Answer Matching Algorithm

The AI uses semantic matching to map answers to questions:
1. **Question Number Matching**: If the text includes "Question 1:", "Q1:", etc., it uses that
2. **Semantic Matching**: If no question numbers are present, it analyzes the content and matches based on meaning
3. **Context Awareness**: It considers the structure and flow of the submission
4. **Confidence Scoring**: Assigns high/medium/low confidence based on match certainty

## Best Practices

### For Best Results:

1. **Encourage students to use question numbers** in their submissions
2. **For handwritten submissions**: Take clear, high-resolution photos
3. **For PDFs**: Ensure text is readable and not too compressed
4. **Always review parsed answers** before submitting - AI is helpful but not perfect
5. **Check confidence indicators** - yellow and red indicators need extra attention

### Common Issues and Solutions:

**Issue**: AI couldn't find answers
- **Solution**: Check if the text was extracted correctly. For images, try a clearer photo.

**Issue**: Answers matched to wrong questions
- **Solution**: Manually correct them in the review step. Consider asking students to include question numbers.

**Issue**: OCR extracted gibberish
- **Solution**: The image quality may be poor. Try re-uploading a clearer image or type manually.

**Issue**: "OpenAI API key not configured" error
- **Solution**: Go to Settings and add your OpenAI API key.

## Requirements

### OpenAI API Key
This feature requires an OpenAI API key configured in Settings:
1. Go to Settings page
2. Enter your OpenAI API key
3. The key needs access to GPT-4o model for optimal results

### Supported Models
- **GPT-4o**: Required for OCR (Vision API) and text parsing
- Falls back gracefully if Vision API is unavailable

## Privacy and Security

- All processing happens through your own OpenAI API key
- Student submissions are sent to OpenAI for processing
- No data is permanently stored at OpenAI (per their API policy)
- All parsed data is stored in your MongoDB database
- Consider your institution's data privacy policies before using with sensitive information

## Limitations

1. **Accuracy**: AI parsing is not 100% accurate - always review results
2. **Complex Formatting**: Highly complex layouts may not parse perfectly
3. **Handwriting**: Very poor handwriting may not OCR accurately
4. **Large Files**: Very large PDFs or images may take longer to process
5. **Cost**: Each parsing operation uses OpenAI API credits

## Future Enhancements

Potential improvements:
- Batch upload (multiple submissions at once)
- Support for Word documents (.docx)
- Improved confidence scoring
- Answer preview before final parsing
- Custom parsing prompts per assignment
- Support for multi-page submissions

## Troubleshooting

### Parsing takes too long
- Large files can take 20-60 seconds
- Images with lots of text may take longer
- Check your internet connection

### Low confidence scores
- Add more context to questions
- Ensure student answers are clearly formatted
- Consider manual entry for ambiguous answers

### API errors
- Check if your OpenAI API key is valid
- Ensure you have sufficient API credits
- Verify your key has access to GPT-4o model

## Support

For issues or questions:
1. Check the console logs for detailed error messages
2. Verify your OpenAI API key in Settings
3. Review the parse summary and warnings
4. Check that the assignment has questions defined

---

**Last Updated**: October 31, 2025
**Version**: 1.0.0

