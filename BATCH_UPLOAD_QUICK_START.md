# Batch Upload - Quick Start Guide

## What's New? 🎉

You can now upload **multiple student submissions at once**! The AI will automatically:
- ✅ Extract student name
- ✅ Extract student email/ID
- ✅ Parse and map all answers to questions

Processing happens **in the background** so you can explore completed submissions while others are still processing.

## How to Use (3 Simple Steps)

### 1️⃣ Open Batch Upload
- Go to any assignment
- Click "Submissions & Grading" tab
- Click the **"📦 Batch Upload"** button (purple)

### 2️⃣ Add Files
**Option A:** Drag & drop files into the upload zone
**Option B:** Click to browse and select multiple files

Supported formats: PDF, Images, Markdown, Text

### 3️⃣ Start Processing
- Review your file list (can remove any)
- Click **"🚀 Start Processing"**
- Watch the real-time progress!

## What You'll See

### While Processing:
```
Overall Progress: [████████░░] 8/10 files

File Details:
✅ john_doe.pdf      → John Doe (john@email.com)     [View]
✅ jane_smith.pdf    → Jane Smith (jane@email.com)   [View]
🔄 bob_jones.pdf     → Extracting name & email... 45%
⏳ alice_wang.pdf    → Waiting...
❌ corrupted.pdf     → Error: Failed to extract text
```

### For Each File:
- ⏳ **Pending**: Waiting in queue
- 🔄 **Processing**: Shows current step & progress bar
- ✅ **Completed**: Shows name, email, and "View" button
- ❌ **Error**: Shows error message

### Processing Steps (per file):
1. Extracting text... (10-30%)
2. Extracting name & email... (30-50%)
3. Parsing answers... (50-80%)
4. Creating submission... (80-100%)

## Key Features

✨ **Multiple Files**: Upload 5, 10, 20+ files at once
⚡ **Parallel Processing**: All files process simultaneously
📊 **Real-Time Progress**: See exactly what's happening
🎯 **Smart Extraction**: AI finds names and emails automatically
🔄 **Background Processing**: Explore completed submissions while others process
🛡️ **Error Handling**: Failed files don't block successful ones

## Tips for Best Results

1. **File Naming**: Include student names (e.g., "john_doe_hw1.pdf")
2. **Student Info**: Ask students to put name/email at top of document
3. **Question Numbers**: Students should label answers (Q1, Q2, etc.)
4. **Image Quality**: Use clear, high-resolution photos for handwritten work
5. **Batch Size**: 5-20 files at a time works best

## Time Estimates

- **Text/Markdown**: ~20-30 seconds per file
- **PDF**: ~40-60 seconds per file
- **Images (with OCR)**: ~60-90 seconds per file

Processing is parallel, so 10 files ≈ same time as 1 file!

## Troubleshooting

**Q: Name/Email not found?**
A: AI uses defaults (you can edit after). Check if student included their info.

**Q: Processing stuck?**
A: Wait 2-3 minutes. Check submissions list (may have completed). Refresh if needed.

**Q: Wrong answers mapped?**
A: Edit the submission after processing. Ask students to use question numbers.

**Q: "OpenAI API key not configured"?**
A: Go to Settings → Add your OpenAI API key

## What Happens Behind the Scenes

```
For each file:
1. Text Extraction → AI reads the document
2. Metadata Extraction → AI finds name & email
3. Answer Parsing → AI maps answers to questions
4. Submission Creation → Saved to database

Status updates every 2 seconds
You can close the modal anytime (processing continues)
```

## Comparison: Old vs New

| Feature | Single Upload | Batch Upload ✨ |
|---------|--------------|----------------|
| Files at once | 1 | Unlimited |
| Enter name/email | Manually | AI extracts |
| Processing | Wait for each | Parallel |
| Progress | Basic | Detailed per-file |
| Multitask | No | Yes |

## Need More Details?

📖 **User Guide**: See `BATCH_UPLOAD_FEATURE.md` for complete documentation
🔧 **Technical Docs**: See `BATCH_UPLOAD_IMPLEMENTATION.md` for developer details

## Quick Demo Workflow

```
1. Click "📦 Batch Upload"
2. Drag 5 PDF files into the upload zone
3. Click "🚀 Start Processing 5 Files"
4. Watch as each file processes:
   - submission1.pdf ✅ → View John's submission
   - submission2.pdf 🔄 45% → Extracting name & email...
   - submission3.pdf ⏳ → Waiting...
   - etc.
5. Click "View" on any completed submission to grade it
6. Click "✓ Done" when all files are processed
7. All submissions now appear in your submissions list
```

## That's It! 🎊

You're ready to batch upload student submissions and save tons of time!

**Pro Tip**: This feature is perfect for handling class submissions after an exam or assignment deadline.

---

**Questions?** Check the main documentation or console logs for detailed errors.

