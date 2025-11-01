# Grading Agent Context - What AI Sees ✅ UPDATED

## ✅ Enhanced Context (What the AI NOW receives)

### 1. System Prompt
- Instructions on how to grade
- Feedback format requirements (bullet points for "Good things" and "Improvement opportunities")
- JSON response structure
- Temperature: 0.3

### 2. 🆕 Assignment Context
```
## Assignment Context:
Title: {assignmentTitle}
Description: {assignmentDescription}
Total Points: {totalPoints}
```
- **Includes**: Assignment title, description, total points
- **Purpose**: Provides context about what the assignment is testing

### 3. Question Information
```
## Question:
{questionText}
```
- **Includes**: The question text only
- **Missing**: Question points/percentage, question context, any attachments or images

### 4. Rubric Information
```
## Rubrics:

Criteria: {criteriaName} (ID: {rubricId})
  Level 0: {levelName} ({percentage}%) - {description}
  Level 1: {levelName} ({percentage}%) - {description}
  Level 2: {levelName} ({percentage}%) - {description}
  ...
```
- **Includes**: All rubric criteria with level names, percentages, and descriptions
- **Missing**: Nothing major - this is comprehensive

### 5. 🆕 Agent's Own Previous Feedback (Consistency)
```
## Your Previous Feedback on Other Students:
You have already graded {N} other student(s) for this question. Use these as reference for consistency:

Student 1 Answer: {answerText...}
Your Grades:
  - Criteria Name: Level 2
    Good things: • Point 1 • Point 2...

Student 2 Answer: {answerText...}
Your Grades:
  - Criteria Name: Level 1
    Good things: • Point 1...
```
- **Includes**: The agent's own previous grades and feedback for other students on THIS SAME QUESTION
- **Purpose**: Ensures grading consistency across all students
- **Benefits**: 
  - Agent can calibrate its strictness based on its own previous decisions
  - Maintains fairness - similar answers get similar grades
  - Prevents drift in grading standards

### 6. All Student Answers (For Calibration)
```
### All Student Answers (for calibration):

Student 1: {answerText}
Student 2: {answerText}
Student 3: {answerText}
...
```
- **Includes**: Raw answer text from all students for this question
- **Missing**: 
  - Student names/emails (anonymized for blind grading)
  - Student IDs
  - Submission dates
  - Previous grades/feedback
  - Student metadata

### 7. 🆕 Current Student's Full Assignment (Holistic View)
```
## Current Student's Full Assignment Submission:
This student has answered {N} question(s) in this assignment. Here are all their answers for context:

Question 1:
Q: {questionText}
A: {answerText}

Question 2 (⭐ CURRENT - THE ONE TO GRADE):
Q: {questionText}
A: {answerText}

Question 3:
Q: {questionText}
A: {answerText}
```
- **Includes**: All of the current student's answers to ALL questions in the assignment
- **Purpose**: Provides holistic context about the student's overall performance
- **Benefits**:
  - Can see if student understands concepts from earlier questions
  - Can identify patterns in student's thinking across the assignment
  - Helps contextualize this specific answer within their full submission

### 8. Current Student's Answer (The One to Grade)
```
## Current Student's Answer to Grade:
{currentAnswer.answerText}
```
- **Includes**: Only the answer text for the student being graded
- **Missing**:
  - Student name/email (anonymized)
  - Submission timestamp
  - Any previous feedback or grades
  - Student academic history
  - Context about the student

---

## What's NOT Currently Included

### Student Information (Intentionally Excluded for Blind Grading)
- Student name
- Student email
- Student ID
- Submission date/time

### Answer Context
- Previous feedback from other agents
- Current grade/level selections
- Points awarded so far
- Instructor comments

### Assignment Context
- Assignment title
- Assignment description
- Total points for assignment
- Due date
- Assignment instructions

### Question Metadata
- Point value/percentage for this question
- Question type
- Expected answer length
- Reference materials
- Sample answers

### Historical Context
- Previous submissions from this student
- Class average/distribution
- Common mistakes
- Example high-scoring answers

---

## Recommendations for Context Enhancement

### High Priority
1. **Assignment context** - Title, description, learning objectives
2. **Question metadata** - Point value, expected answer characteristics
3. **Reference materials** - If the question refers to specific readings/materials
4. **Previous agent feedback** - Allow agents to see other agents' feedback (consensus building)

### Medium Priority
5. **Class statistics** - Average score, distribution (for calibration)
6. **Sample answers** - Example of perfect/high-scoring answers
7. **Common mistakes** - Known pitfalls students fall into

### Low Priority (Privacy/Blind Grading Concerns)
8. Student names/emails - Should remain anonymized
9. Historical performance - Could introduce bias
10. Submission timing - Could introduce bias

---

## Current Data Flow

```
Frontend (grade-by-question page)
  ↓
Sends to API:
  - agentId
  - questionText (just the text)
  - currentAnswer (whole Answer object with answerText)
  - allAnswers (array of Answer objects)
  - rubrics (array of Rubric objects with levels)
  ↓
API (agent-suggest route)
  ↓
Formats into prompt with:
  - System instructions
  - Question text
  - Rubric descriptions
  - All student answers
  - Current answer
  ↓
Sends to OpenRouter/AI Model
  ↓
Returns:
  - suggestedLevelIndex
  - justification (Good things bullets)
  - improvementSuggestion (Improvement opportunities bullets)
```

---

## Next Steps

To improve grading quality, consider adding:

1. **Assignment Description** - Context about what this assignment is testing
2. **Question Point Value** - Helps calibrate the strictness of grading
3. **Learning Objectives** - What skills/knowledge this question assesses
4. **Reference Materials** - If question refers to readings, lectures, etc.

Would you like to add any of these to the grading context?

