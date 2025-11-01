# Batch Upload Feature - Multiple Submission Processing

## Overview

The Batch Upload feature allows instructors to upload multiple student submissions at once and have them processed asynchronously. The AI automatically extracts:
- Student name
- Student email/ID
- All answers mapped to assignment questions

This feature provides real-time progress tracking and allows users to explore completed submissions while others are still processing in the background.

## Key Features

### 1. Multiple File Upload
- **Drag & Drop**: Drag multiple files directly into the upload zone
- **File Picker**: Select multiple files using the file browser
- **Supported Formats**:
  - PDF documents
  - Images (PNG, JPG, JPEG, GIF, WebP) with OCR
  - Markdown files (.md, .markdown)
  - Text files

### 2. Automatic Metadata Extraction
For each file, the AI extracts:
- **Student Name**: Automatically identified from the document
- **Email/ID**: Student email or ID found in the document
- **Answers**: All answers are parsed and mapped to the correct questions

### 3. Real-Time Progress Tracking
- **Overall Progress**: Shows total completion percentage
- **Per-File Status**: Each file displays:
  - Current processing step
  - Progress percentage (0-100%)
  - Status icon (⏳ pending, 🔄 processing, ✅ completed, ❌ error)
  - Extracted student information once available

### 4. Processing Steps (Per File)
Each file goes through these stages with clear feedback:
1. **Extracting text** (10-30%): OCR/text extraction from file
2. **Extracting metadata** (30-50%): AI identifies student name and email
3. **Parsing answers** (50-80%): AI maps answers to questions
4. **Creating submission** (80-100%): Saves to database

### 5. Async Processing
- Files are processed in parallel in the background
- Users can explore completed submissions immediately
- Status updates every 2 seconds via polling
- Can close modal and processing continues

## How to Use

### Step 1: Navigate to Submissions Tab
1. Open an assignment
2. Click on "Submissions & Grading" tab
3. Click the "📦 Batch Upload" button

### Step 2: Select Files
**Method A: Drag & Drop**
- Drag multiple files from your file explorer
- Drop them into the upload zone

**Method B: File Picker**
- Click "Click to select files"
- Use Ctrl/Cmd+Click to select multiple files
- Click "Open"

### Step 3: Review Selected Files
- See the list of all selected files
- Check file names and sizes
- Remove any files you don't want to upload
- Add more files if needed

### Step 4: Start Processing
- Click "🚀 Start Processing X File(s)"
- Processing begins immediately
- Real-time progress is displayed

### Step 5: Monitor Progress
**Overall Status Bar**
- Shows total progress (X/Y files completed)
- Displays success count and error count

**Individual File Cards**
Each file shows:
- ⏳ **Pending**: Waiting in queue
- 🔄 **Processing**: Currently being processed
  - Shows current step (e.g., "Extracting text...")
  - Progress bar (0-100%)
- ✅ **Completed**: Successfully processed
  - Displays extracted student name
  - Displays extracted email
  - "View" button to see the submission
- ❌ **Error**: Processing failed
  - Shows error message

### Step 6: Explore Results
**While Processing:**
- Click "View" on any completed submission to grade it
- Processing continues in the background
- Return to the batch upload modal anytime

**After Completion:**
- Click "✓ Done" to close modal
- All new submissions appear in the submissions list

## Technical Details

### Architecture

#### Models

**BatchUpload Model** (`models/BatchUpload.ts`)
```typescript
{
  assignmentId: string;
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  status: 'pending' | 'processing' | 'completed' | 'partial' | 'failed';
  files: [
    {
      fileName: string;
      fileSize: number;
      status: 'pending' | 'processing' | 'completed' | 'error';
      currentStep: 'extracting_text' | 'extracting_metadata' | 'parsing_answers' | 'creating_submission';
      progress: number; // 0-100
      submissionId?: string;
      studentName?: string;
      studentEmail?: string;
      error?: string;
      startedAt?: Date;
      completedAt?: Date;
    }
  ];
}
```

**Updated Submission Model**
- Added `processingStatus` field
- Added `extractedText` field (stores original text)
- Added `batchUploadId` field (reference to batch)

#### API Endpoints

**POST `/api/batch-upload`**
- Initializes a new batch upload
- Creates BatchUpload record with pending files
- Returns batchId for tracking

**POST `/api/batch-upload/process-file`**
- Processes a single file from the batch
- Steps:
  1. Extract text (OCR for images/PDFs)
  2. Extract student metadata (name, email)
  3. Parse answers using AI
  4. Create submission and answers in database
- Updates BatchUpload status in real-time

**GET `/api/batch-upload?batchId={id}`**
- Returns current status of a batch upload
- Used for polling progress updates

#### Frontend Flow

1. **File Selection**: User selects multiple files via drag-drop or file picker
2. **Initialization**: POST to `/api/batch-upload` creates batch record
3. **Async Processing**: Each file sent to `/api/batch-upload/process-file` in parallel
4. **Status Polling**: GET `/api/batch-upload?batchId={id}` every 2 seconds
5. **UI Updates**: Progress bars and status icons update in real-time
6. **Completion**: User can view/grade submissions or close modal

### AI Processing

#### 1. Text Extraction
- **PDFs**: Uses OpenAI GPT-4o to extract text
- **Images**: Uses GPT-4o Vision API for OCR
- **Text/Markdown**: Direct text reading

#### 2. Metadata Extraction
Uses GPT-4o with specialized prompt:
```
Extract student name and email from this document.
If not found, use defaults:
- name: "Unknown Student"
- email: "no-email@unknown.com"
```

#### 3. Answer Parsing
Same intelligent parsing as single-file upload:
- Maps answers to questions using semantic matching
- Handles various answer formats
- Provides confidence scores

## Best Practices

### For Optimal Results

1. **File Naming**: Include student names in filenames when possible (e.g., "john_doe_assignment.pdf")
2. **Document Structure**: Encourage students to include their name and email at the top
3. **Question Numbers**: Students should label answers with question numbers
4. **File Quality**: Use clear, high-resolution images for handwritten submissions
5. **Batch Size**: Upload 5-20 files at a time for best performance

### Common Scenarios

**Scenario 1: Email Not Found**
- AI will use default: "no-email@unknown.com"
- You can edit the submission after processing

**Scenario 2: Name Not Found**
- AI will use default: "Unknown Student"
- You can edit the submission after processing

**Scenario 3: Processing Takes Long**
- Each file takes 30-90 seconds depending on:
  - File size
  - File type (images take longer due to OCR)
  - Number of questions
- Processing is async - you can explore completed files while others process

**Scenario 4: Processing Error**
- File shows error status with reason
- Completed files are still saved
- You can re-upload failed files individually

## Troubleshooting

### Issue: "OpenAI API key not configured"
**Solution**: 
1. Go to Settings
2. Enter your OpenAI API key
3. Ensure key has access to GPT-4o model

### Issue: Files Not Processing
**Check:**
- File format is supported
- Files aren't corrupted
- Internet connection is stable
- OpenAI API has sufficient credits

### Issue: Incorrect Name/Email Extracted
**Solution:**
1. After processing completes, click "View" on the submission
2. Edit the student name and email
3. Save changes

### Issue: Answers Mapped to Wrong Questions
**Solution:**
1. View the submission
2. Manually correct the answers
3. Consider asking students to use clear question numbers

### Issue: Processing Stuck
**Solution:**
1. Wait 2-3 minutes (some files take time)
2. Check browser console for errors
3. Refresh page and check submissions list (may have completed)
4. Re-upload if necessary

## Comparison: Single vs Batch Upload

| Feature | Single Upload | Batch Upload |
|---------|--------------|--------------|
| Files at once | 1 | Unlimited |
| Manual name/email entry | Yes | No (AI extracts) |
| Processing | Synchronous | Asynchronous |
| Progress tracking | Basic | Detailed per-file |
| Can explore while processing | No | Yes |
| Best for | Individual submissions | Multiple submissions |
| Time per file | 30-90 seconds | 30-90 seconds (parallel) |

## Performance Considerations

### Processing Time
- **Small text files**: ~20-30 seconds per file
- **PDFs**: ~40-60 seconds per file
- **Images with OCR**: ~60-90 seconds per file

### Parallel Processing
- All files are processed in parallel
- Limited only by OpenAI API rate limits
- Typical rate limit: 60 requests per minute (GPT-4o)

### Resource Usage
- Minimal browser memory (polling is lightweight)
- Server-side processing (no client-side load)
- Database updates are batched efficiently

## Privacy & Security

- All processing uses your OpenAI API key
- Student data is stored in your MongoDB database
- No data shared with third parties
- Extracted text is truncated to 10,000 characters in database
- Follow your institution's data privacy policies

## Future Enhancements

Potential improvements:
- Email notifications when batch completes
- Export batch processing report
- Retry failed files automatically
- Support for .docx files
- Custom metadata extraction rules
- Bulk editing of extracted metadata
- Processing history and analytics

## API Response Examples

### Initialize Batch
**Request:**
```json
POST /api/batch-upload
{
  "assignmentId": "abc123",
  "files": [
    { "name": "student1.pdf", "size": 1048576 },
    { "name": "student2.pdf", "size": 2097152 }
  ]
}
```

**Response:**
```json
{
  "batchId": "batch_xyz789",
  "message": "Batch upload initialized",
  "totalFiles": 2
}
```

### Get Status
**Request:**
```
GET /api/batch-upload?batchId=batch_xyz789
```

**Response:**
```json
{
  "_id": "batch_xyz789",
  "assignmentId": "abc123",
  "totalFiles": 2,
  "completedFiles": 1,
  "failedFiles": 0,
  "status": "processing",
  "files": [
    {
      "fileName": "student1.pdf",
      "fileSize": 1048576,
      "status": "completed",
      "progress": 100,
      "submissionId": "sub_123",
      "studentName": "John Doe",
      "studentEmail": "john@example.com",
      "completedAt": "2025-11-01T10:30:00Z"
    },
    {
      "fileName": "student2.pdf",
      "fileSize": 2097152,
      "status": "processing",
      "currentStep": "parsing_answers",
      "progress": 65,
      "startedAt": "2025-11-01T10:29:00Z"
    }
  ],
  "createdAt": "2025-11-01T10:28:00Z",
  "updatedAt": "2025-11-01T10:30:15Z"
}
```

## Support

For issues or questions:
1. Check the console logs for detailed error messages
2. Verify OpenAI API key and credits
3. Ensure assignment has questions defined
4. Check that files are valid formats
5. Review this documentation

---

**Last Updated**: November 1, 2025
**Version**: 1.0.0
**Feature Status**: Production Ready ✅

