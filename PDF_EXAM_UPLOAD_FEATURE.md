# Exam Upload Feature

## Overview
This feature allows instructors to import exams in multiple formats and automatically extract questions and rubrics using AI (OpenAI GPT-4o). Supports PDF files, Markdown files, and direct text pasting.

## How It Works

### 1. User Flow
1. Navigate to an assignment's "Questions & Rubrics" tab
2. Click the **"📄 Upload Exam using AI"** button
3. Choose your input method:
   - **📁 Upload File**: Select a PDF or Markdown (.md) file
   - **📝 Paste Text**: Directly paste exam content
4. Click **"🚀 Extract Questions & Rubrics"**
5. Wait for AI to process the content (this may take a minute)
6. Review and edit the extracted questions and rubrics
7. Click **"✓ Confirm & Add All Questions"** to save

### 2. Features
- **Multiple Input Methods**:
  - **PDF Upload**: Drag-and-drop or click to select PDF files
  - **Markdown Upload**: Upload .md or .markdown files
  - **Text Paste**: Directly paste exam content from any source
- **AI Extraction**: Uses OpenAI GPT-4o to:
  - Extract text from PDF using Assistants API with file_search
  - Parse Markdown and plain text directly
  - Identify questions and their numbering
  - Detect point values or distribute them evenly
  - Create or extract rubrics for each question
  - Generate performance levels (Excellent, Good, Fair, Poor, etc.)
- **Review & Edit Interface**: 
  - Edit question text
  - Adjust point percentages
  - Modify rubric criteria names
  - Edit performance levels and their descriptions
  - Remove unwanted questions or rubrics
- **Bulk Import**: Add all questions and rubrics with a single confirmation

### 3. Technical Implementation

#### API Endpoint: `/api/extract-exam`
- **Method**: POST
- **Input**: 
  - PDF file via FormData
  - Markdown file via FormData
  - Plain text via JSON (`{ text: "..." }`)
- **Output**: JSON with structured questions and rubrics

**Process for PDF**:
1. Upload PDF to OpenAI Files API
2. Create temporary assistant with file_search capability
3. Extract text content from PDF
4. Use GPT-4o to structure the data into questions and rubrics
5. Return structured JSON response
6. Clean up temporary resources

**Process for Markdown/Text**:
1. Read text content directly
2. Use GPT-4o to structure the data into questions and rubrics
3. Return structured JSON response

#### Frontend Components
- **State Management**: Added state variables for:
  - Upload modal visibility
  - Upload mode (file vs text)
  - Selected file
  - Pasted text content
  - Extraction status
  - Extracted questions and rubrics
  - Error handling
  
- **UI Components**:
  - Upload button in questions tab header
  - Modal dialog with mode tabs (Upload File / Paste Text)
  - File selector supporting PDF and Markdown
  - Text area for direct pasting
  - Progress indicator during extraction
  - Editable question and rubric cards
  - Confirmation buttons

#### Data Structure
```typescript
interface ExtractedQuestion {
  questionText: string;
  questionNumber: number;
  pointsPercentage: number;
  rubrics: Array<{
    criteriaName: string;
    levels: Array<{
      name: string;
      description: string;
      percentage: number;
    }>;
  }>;
}
```

### 4. Requirements
- **OpenAI API Key**: Must be configured in Settings
- **Supported Formats**: 
  - PDF files (.pdf)
  - Markdown files (.md, .markdown)
  - Plain text (pasted directly)
- **AI Model**: GPT-4o (automatically used)

### 5. Error Handling
- Invalid file type detection
- API key validation
- Network error handling
- User-friendly error messages with links to Settings

### 6. User Experience Enhancements
- Real-time feedback during extraction
- Editable fields for all extracted data
- Remove individual questions or rubrics before confirming
- Summary of extraction results
- Validation of required fields

## Benefits
1. **Time-Saving**: Converts existing exams to digital format in minutes
2. **Flexible Input**: Support for PDF, Markdown, and plain text
3. **AI-Powered**: Leverages GPT-4o to intelligently identify and structure exam content
4. **Editable**: Full editing capability before final confirmation
5. **Accurate**: AI generates appropriate rubrics based on question content
6. **Batch Processing**: Import entire exams at once
7. **No Format Constraints**: Paste from Word, Google Docs, or any text source

## Usage Tips
- **For all formats**: Include clear question numbering
- **For all formats**: Include point values for accurate distribution
- **For PDFs**: Ensure text is selectable (not scanned images)
- **For Markdown**: Use proper formatting with headers or numbered lists
- **For pasted text**: Copy directly from Word, Google Docs, or any text editor
- Review AI-generated rubrics for alignment with grading criteria
- Adjust percentages to ensure they sum to 100%
- Use the edit feature to refine extracted content before confirming

## Example Text Format

```
Question 1: What is UX design? (25 points)
Describe the key principles of user experience design.

Question 2: Explain the design thinking process. (25 points)
Include all stages and explain their importance.

Question 3: What is a usability test? (25 points)
Describe when and how to conduct one.

Question 4: Define accessibility in web design. (25 points)
Provide examples of accessible design practices.
```

## Future Enhancements
- Support for Word documents (.docx)
- Support for scanned PDFs with OCR
- Batch upload multiple exams
- Save extraction templates
- Preview files before extraction
- Import from Google Drive or Dropbox
- Export to other formats

