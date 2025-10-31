# Rubric-Based Grading System - Update

## Major Changes

The grading system has been completely redesigned to follow proper rubric-based assessment practices.

---

## What Changed

### 1. ✅ **Feedback Per Criteria** (Not Per Question)

**Old System:**
- One feedback field per question
- Generic feedback for entire answer

**New System:**
- Separate feedback field for **each criteria**
- Specific, targeted feedback per rubric criteria
- More granular and helpful for students

### 2. ✅ **Required Level Selection for Each Criteria**

**Old System:**
- Select one rubric level (optional)
- OR enter custom percentage
- Only one evaluation per question

**New System:**
- **Must select a level for EACH criteria**
- Each criteria is evaluated separately
- Final score = average of all criteria percentages
- No custom percentage override
- Validation prevents saving until all criteria are evaluated

---

## New Data Model

### Answer Structure

```typescript
{
  _id: string
  submissionId: string
  questionId: string
  answerText: string
  criteriaEvaluations: [
    {
      rubricId: string          // Which criteria
      selectedLevelIndex: number // Which level selected
      feedback: string           // Feedback for this criteria
    },
    ...
  ]
  pointsPercentage: number      // Calculated average
}
```

### Example

**Question:** "Explain usability heuristics" (50% of assignment = 50 points)

**Criteria 1: Accuracy**
- Selected Level: "Good" (75%)
- Feedback: "Covered 8 out of 10 heuristics correctly"

**Criteria 2: Clarity**
- Selected Level: "Excellent" (100%)
- Feedback: "Explanation is very clear and well-structured"

**Calculation:**
- Average: (75% + 100%) / 2 = 87.5%
- Points: 87.5% of 50 = 43.75 points

---

## New Grading Workflow

### Step 1: View Question
- See student's answer
- View all criteria for this question

### Step 2: Evaluate Each Criteria
For each criteria:
1. Read the level options (Excellent, Good, Fair, etc.)
2. **Click on the appropriate level**
3. **Add specific feedback** for this criteria
4. Move to next criteria

### Step 3: Review Score
- See calculated average percentage
- See final points for question
- System calculates automatically

### Step 4: Save All
- Click "Save All Grades" button
- System validates all criteria are evaluated
- Shows error if any criteria missing

---

## User Interface

### Criteria Evaluation Section

Each criteria shows:
- **Criteria Name** (e.g., "Accuracy", "Completeness")
- **Evaluation Status** (✓ Evaluated / ⚠ Not evaluated yet)
- **Level Selection Buttons** (click to select)
  - Highlighted when selected
  - Shows percentage for each level
- **Feedback Text Area** (specific to this criteria)

### Visual Indicators

- ✓ Green checkmark = Criteria evaluated
- ⚠ Orange warning = Not evaluated yet
- Selected level = Blue highlight with shadow
- Unselected levels = White background

### Score Display

```
Points for This Question:
Average of all criteria: 87.5%
43.75 / 50.00
```

---

## Validation

### Before Saving

System checks:
1. All criteria must have a level selected
2. If any criteria is missing, shows error:
   ```
   ✗ Please select a level for all criteria before saving
   ```

### After Saving

Shows success message:
```
✓ Grades saved successfully!
```

---

## CSV Export

### Enhanced Export Format

**Old Format:**
```csv
Student, Q1 Answer, Q1 Points, Q1 Feedback
```

**New Format:**
```csv
Student, Q1 Answer, 
Q1 - Accuracy Level, Q1 - Accuracy %, Q1 - Accuracy Feedback,
Q1 - Clarity Level, Q1 - Clarity %, Q1 - Clarity Feedback,
Q1 Average %, Q1 Points
```

### Example CSV Row:
```csv
John Doe, john@email.com, 2024-01-15,
"Student explained heuristics...",
Good, 75%, "Covered 8/10 heuristics",
Excellent, 100%, "Very clear explanation",
87.5%, 43.75
```

---

## Benefits

### 1. **More Accurate Assessment**
- Each aspect evaluated separately
- Can't compensate one weakness with another strength
- More granular evaluation

### 2. **Better Feedback**
- Students see exactly what they did well/poorly in each area
- Actionable, specific feedback
- Clear connection between feedback and score

### 3. **Consistency**
- Forces evaluation of all criteria
- Can't skip important aspects
- More standardized grading

### 4. **Transparency**
- Students see how each criteria contributed to final score
- Clear rubric application
- No arbitrary points

---

## Example Grading Session

### Assignment: "HCI Midterm"
Total Points: 100

### Question 1: "Explain 5 usability heuristics" (50%)
Worth: 50 points

**Criteria 1: Accuracy**
- Levels: Excellent (100%), Good (75%), Fair (50%), Poor (25%)
- Selected: Good (75%)
- Feedback: "Explained 4 out of 5 heuristics correctly. Missing visibility heuristic."

**Criteria 2: Clarity**
- Levels: Excellent (100%), Good (75%), Fair (50%), Poor (25%)
- Selected: Excellent (100%)
- Feedback: "Very clear explanations with good examples."

**Criteria 3: Completeness**
- Levels: Excellent (100%), Good (75%), Fair (50%), Poor (25%)
- Selected: Good (75%)
- Feedback: "Most heuristics covered but could use more detail."

**Calculation:**
- Average: (75% + 100% + 75%) / 3 = 83.33%
- Points: 83.33% of 50 = 41.67 points

### Question 2: "Design Critique" (50%)
Worth: 50 points
*(Similar evaluation process)*

### Total Score:
- Question 1: 41.67 points
- Question 2: 45.00 points
- **Total: 86.67 / 100**

---

## Migration Notes

### For Existing Data

If you have submissions graded with the old system:
- Old grading data won't display correctly
- Re-grade existing submissions with new system
- Old data structure is incompatible

### Recommendation
Start fresh with the new system for best experience.

---

## Tips for Educators

### 1. **Design Comprehensive Rubrics**
- Include multiple criteria per question
- Cover different aspects (accuracy, clarity, completeness, etc.)
- Define clear level descriptors

### 2. **Be Consistent**
- Use same interpretation of levels across students
- Refer to level descriptions
- Grade one criteria across all students before moving to next

### 3. **Provide Specific Feedback**
- Explain why you selected each level
- Give examples from their answer
- Suggest improvements

### 4. **Use Percentages Wisely**
- Don't need 100%/0% extremes for every criteria
- 75% can be "good" not "bad"
- Calibrate your scale appropriately

---

## Technical Details

### Data Storage

**Before:**
```javascript
{
  selectedRubricId: "rubric123",
  selectedLevelIndex: 1,
  feedback: "Good work overall",
  pointsPercentage: 75
}
```

**After:**
```javascript
{
  criteriaEvaluations: [
    {
      rubricId: "rubric123",
      selectedLevelIndex: 1,
      feedback: "Good accuracy"
    },
    {
      rubricId: "rubric456",
      selectedLevelIndex: 0,
      feedback: "Excellent clarity"
    }
  ],
  pointsPercentage: 87.5  // Calculated average
}
```

### Score Calculation

```javascript
// Average percentage from all criteria
const totalPercentage = criteriaEvaluations.reduce((sum, evaluation) => {
  const rubric = rubrics.find(r => r._id === evaluation.rubricId);
  const level = rubric.levels[evaluation.selectedLevelIndex];
  return sum + level.percentage;
}, 0);

const averagePercentage = totalPercentage / rubrics.length;

// Apply to question weight
const questionScore = (averagePercentage / 100) * questionMaxPoints;
```

---

## Build Status

✅ **All Changes Implemented**
- No TypeScript errors
- No linting errors
- Build successful
- All validations working

---

## Summary

The grading system now follows proper rubric-based assessment:

1. ✅ **Evaluate each criteria separately**
2. ✅ **Provide specific feedback per criteria**
3. ✅ **Required selection for all criteria**
4. ✅ **Automatic score calculation**
5. ✅ **Comprehensive CSV export**

This creates a more rigorous, consistent, and transparent grading experience! 🎓

