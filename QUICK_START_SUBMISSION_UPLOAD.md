# Quick Start Guide: AI-Powered Submission Upload

## 🚀 Get Started in 5 Minutes

### Step 1: Configure OpenAI API Key (One-time setup)
1. Go to [http://localhost:3000/settings](http://localhost:3000/settings)
2. Enter your OpenAI API key
3. Click "Save Settings"

> **Don't have an API key?** Get one at [platform.openai.com](https://platform.openai.com/api-keys)

### Step 2: Navigate to Your Assignment
1. Go to the home page
2. Click on an assignment (or create a new one)
3. Make sure you have questions added to the assignment

### Step 3: Add a Submission with Upload
1. Click on "Submissions & Grading" tab
2. Click "+ Add Submission"
3. Enter student name and email
4. Choose "📤 Upload / Paste (AI Parsing)"

### Step 4: Choose Your Input Method

#### Option A: Upload a File 📁
- Click "Upload File" tab
- Select a file:
  - **PDF**: Student's exam PDF
  - **Image**: Photo of handwritten/typed submission
  - **Markdown**: .md file with answers
  - **Text**: .txt file
- Click "🤖 Parse Submission with AI"

#### Option B: Paste Text 📝
- Click "Paste Text" tab
- Paste the student's submission
- Click "🤖 Parse Submission with AI"

#### Option C: Paste Markdown 📋
- Click "Paste Markdown" tab
- Paste markdown-formatted content
- Click "🤖 Parse Submission with AI"

### Step 5: Review Parsed Answers
- Wait 10-30 seconds for AI to process
- Review the extracted answers
- Check confidence indicators:
  - 🟢 Green (high) = Good match
  - 🟡 Yellow (medium) = Review recommended
  - 🔴 Red (low) = Definitely review
  - ⚪ Gray = No answer found
- Edit any answers that need correction

### Step 6: Submit
- Click "Create Submission"
- Done! The submission is now ready for grading

## 💡 Pro Tips

### For Best Results:
1. **Use question numbers**: Ask students to label answers (Q1, Question 1, etc.)
2. **Clear images**: Take well-lit, focused photos
3. **High-resolution PDFs**: Avoid heavily compressed PDFs
4. **Always review**: AI is smart but not perfect - review before submitting

### Common Formats:

#### Text Format Example:
```
Question 1: UX design is the process of...
Question 2: Design thinking includes five stages...
```

#### Markdown Format Example:
```markdown
# Question 1
UX design is the process of...

# Question 2
Design thinking includes five stages...
```

## 🎯 Use Cases

### 1. Paper Exams
- Take photos of handwritten exams
- Upload images
- AI performs OCR and extracts answers

### 2. PDF Submissions
- Students submit PDF documents
- Upload PDF
- AI extracts and maps text to questions

### 3. Email Submissions
- Copy/paste from email
- Use "Paste Text" mode
- AI parses the content

### 4. Markdown Documents
- Students write in markdown
- Upload .md file or paste content
- AI extracts structured answers

## ⚠️ Troubleshooting

### "OpenAI API key not configured"
→ Go to Settings and add your API key

### "No text could be extracted"
→ Check if the file is valid or text is not empty

### Parsing takes too long
→ Large files can take 30-60 seconds, be patient

### Low confidence scores
→ Ask students to use question numbers in their submissions

### OCR not working well
→ Ensure images are clear, well-lit, and high resolution

## 📊 What Gets Parsed?

The AI looks for:
- Question numbers (Q1, Question 1, 1., etc.)
- Answer text
- Structure and formatting
- Context clues

Then it:
- Maps answers to your assignment questions
- Assigns confidence scores
- Flags missing answers
- Preserves student's original text

## 🎓 Example Workflow

1. **Students complete exam** (paper or digital)
2. **Students submit** (PDF, photo, or text)
3. **Instructor receives submission**
4. **Instructor uploads to system** using this feature
5. **AI parses and maps answers** (10-30 seconds)
6. **Instructor reviews** parsed answers
7. **Instructor submits** to system
8. **Ready for grading** using existing grading interface

## 💰 Cost Information

Each parsing operation uses your OpenAI API:
- Text/Markdown: ~$0.01-0.03
- Images (OCR): ~$0.05-0.15
- PDF: ~$0.02-0.10

*Costs vary based on content size and current OpenAI pricing*

## 🔐 Privacy Note

- Processing happens via your OpenAI API key
- Student data is sent to OpenAI for parsing
- No permanent storage at OpenAI
- Data stored in your MongoDB database
- Check your institution's data privacy policies

## 📚 More Information

- Full documentation: [SUBMISSION_UPLOAD_FEATURE.md](./SUBMISSION_UPLOAD_FEATURE.md)
- Implementation details: [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)
- General guide: [README.md](./README.md)

---

**Ready to try it?** Start with a simple text paste to see how it works!

