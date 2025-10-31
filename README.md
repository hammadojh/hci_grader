# HCI Grader - Assignment Management System

A comprehensive Next.js application with MongoDB for educators to manage assignments, create questions, define rubrics, handle submissions, grade student work, and export results.

## Features

- ✅ **Assignment Management**: Create and manage assignments with descriptions
- ✅ **Question Management**: Add multiple questions to each assignment with point values
- ✅ **Rubric System**: Create detailed rubrics for each question with criteria and point distributions
- ✅ **Submission Management**: Add student submissions with answers to all questions
- ✅ **Grading Interface**: Grade submissions by selecting rubrics and providing custom feedback
- ✅ **CSV Export**: Export grading results including all questions, answers, feedback, and scores
- ✅ **Modern UI**: Beautiful, responsive interface with Tailwind CSS

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React, TypeScript
- **Styling**: Tailwind CSS
- **Database**: MongoDB with Mongoose ODM
- **API**: Next.js API Routes (RESTful)

## Prerequisites

- Node.js 18+ installed
- MongoDB installed and running locally (or use MongoDB Atlas)

## Getting Started

### 1. Install MongoDB (if not already installed)

#### macOS:
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

#### Windows:
Download and install from [MongoDB Download Center](https://www.mongodb.com/try/download/community)

#### Linux:
Follow instructions at [MongoDB Linux Installation](https://docs.mongodb.com/manual/administration/install-on-linux/)

### 2. Clone and Setup the Project

```bash
# Navigate to the project directory
cd hci_grader

# Install dependencies (already installed)
npm install

# Create environment file
cp .env.example .env.local
```

### 3. Configure MongoDB Connection

Edit `.env.local` with your MongoDB connection string:

```env
MONGODB_URI=mongodb://localhost:27017/hci_grader
```

For MongoDB Atlas (cloud), use:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/hci_grader?retryWrites=true&w=majority
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage Guide

### 1. Create an Assignment

- On the home page, click "New Assignment"
- Enter assignment title and description
- Click "Create Assignment"

### 2. Add Questions

- Click "Manage" on an assignment
- Go to "Questions & Rubrics" tab
- Click "Add Question"
- Enter question text and max points
- Add multiple questions as needed

### 3. Create Rubrics

- For each question, click "Add Rubric"
- Define criteria (e.g., "Excellent", "Good", "Fair", "Poor")
- Set point values for each rubric level
- Add descriptions for clarity

### 4. Add Submissions

- Go to "Submissions & Grading" tab
- Click "Add Submission"
- Enter student name and email
- Provide answers for each question
- Submit

### 5. Grade Submissions

- Click "Grade" on any submission
- For each answer:
  - Select appropriate rubric criteria
  - Adjust points if needed (custom scoring)
  - Add personalized feedback
- All changes save automatically

### 6. Export Results

- Click "Export CSV" button on assignment detail page
- Download CSV with complete grading results
- CSV includes: student info, answers, points, feedback, and totals

## Project Structure

```
hci_grader/
├── app/
│   ├── api/                    # API routes
│   │   ├── assignments/        # Assignment CRUD
│   │   ├── questions/          # Question CRUD
│   │   ├── rubrics/            # Rubric CRUD
│   │   ├── submissions/        # Submission CRUD
│   │   ├── answers/            # Answer CRUD with grading
│   │   └── export/             # CSV export
│   ├── assignment/[id]/        # Assignment detail page
│   ├── grade/[submissionId]/   # Grading interface
│   ├── page.tsx                # Home page (assignment list)
│   └── layout.tsx              # Root layout
├── models/                     # Mongoose models
│   ├── Assignment.ts
│   ├── Question.ts
│   ├── Rubric.ts
│   ├── Submission.ts
│   └── Answer.ts
├── lib/
│   └── mongodb.ts              # MongoDB connection
└── README.md

```

## Database Schema

### Assignment
- title: String
- description: String
- timestamps

### Question
- assignmentId: Reference to Assignment
- questionText: String
- questionNumber: Number
- maxPoints: Number

### Rubric
- questionId: Reference to Question
- criteria: String
- points: Number
- description: String

### Submission
- assignmentId: Reference to Assignment
- studentName: String
- studentEmail: String
- submittedAt: Date

### Answer
- submissionId: Reference to Submission
- questionId: Reference to Question
- answerText: String
- selectedRubricId: Reference to Rubric (optional)
- feedback: String (optional)
- pointsAwarded: Number

## API Endpoints

### Assignments
- `GET /api/assignments` - List all assignments
- `POST /api/assignments` - Create assignment
- `GET /api/assignments/[id]` - Get single assignment
- `DELETE /api/assignments/[id]` - Delete assignment

### Questions
- `GET /api/questions?assignmentId=xxx` - List questions for assignment
- `POST /api/questions` - Create question

### Rubrics
- `GET /api/rubrics?questionId=xxx` - List rubrics for question
- `POST /api/rubrics` - Create rubric

### Submissions
- `GET /api/submissions?assignmentId=xxx` - List submissions
- `POST /api/submissions` - Create submission

### Answers
- `GET /api/answers?submissionId=xxx` - List answers for submission
- `POST /api/answers` - Create answer
- `PUT /api/answers` - Update answer (grading)

### Export
- `GET /api/export?assignmentId=xxx` - Export grades as CSV

## Development

### Build for Production

```bash
npm run build
npm start
```

### Linting

```bash
npm run lint
```

## Tips

- **Rubric Best Practice**: Create comprehensive rubrics before grading to ensure consistency
- **Backup Data**: Regularly backup your MongoDB database
- **CSV Export**: Use CSV export for record-keeping and integration with other systems
- **Custom Points**: Override rubric points when needed for edge cases

## Troubleshooting

### MongoDB Connection Issues

If you see connection errors:
1. Ensure MongoDB is running: `brew services list` (macOS) or check Task Manager (Windows)
2. Verify connection string in `.env.local`
3. Check MongoDB logs: `tail -f /usr/local/var/log/mongodb/mongo.log` (macOS)

### Port Already in Use

If port 3000 is busy:
```bash
npm run dev -- -p 3001
```

## Future Enhancements

- [ ] User authentication and role-based access
- [ ] Email notifications to students
- [ ] Analytics dashboard
- [ ] Batch CSV upload for submissions
- [ ] Comments and revision requests
- [ ] AI-assisted grading suggestions

## License

MIT License - feel free to use for educational purposes

## Support

For issues and questions, please check the MongoDB and Next.js documentation:
- [Next.js Documentation](https://nextjs.org/docs)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Mongoose Documentation](https://mongoosejs.com/docs/)
