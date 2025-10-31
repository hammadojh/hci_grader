# Quick Start Guide - Updated Version

## What's New? 🎉

### 1. Dark Text Inputs ✅
All text inputs now have dark, readable text.

### 2. Save Button ✅
Grading interface now has an explicit "Save All Grades" button - changes are saved only when you click it.

### 3. Multi-Level Rubrics ✅
Rubrics now have:
- **Criteria Name** (e.g., "Accuracy")
- **Multiple Levels** (e.g., Excellent, Good, Fair, Poor)
- Each level has: name, description, and percentage

### 4. Percentage-Based Grading ✅
- Assignments have a total points value
- Questions are worth a percentage of total
- More flexible and easier to adjust

---

## Getting Started

### 1. Start MongoDB
```bash
brew services start mongodb-community  # macOS
```

### 2. Start the App
```bash
npm run dev
```

### 3. Open Browser
```
http://localhost:3000
```

---

## Create Your First Assignment

### Step 1: Create Assignment
- Click "New Assignment"
- Enter title: "Sample Quiz"
- Enter description: "Testing new grading system"
- **Set Total Points: 100** ← NEW!
- Click "Create Assignment"

### Step 2: Add Questions
- Click "Manage" on your assignment
- Go to "Questions & Rubrics" tab
- Click "Add Question"

**Question 1:**
- Text: "Explain the concept"
- **Percentage: 60%** (= 60 points) ← NEW!
- Click "Add Question"

**Question 2:**
- Text: "Provide examples"
- **Percentage: 40%** (= 40 points) ← NEW!
- Click "Add Question"

✅ Total should be 100%

### Step 3: Create Multi-Level Rubrics ← NEW!

**For Question 1:**
- Click "Add Rubric"
- **Criteria Name: "Accuracy"** ← NEW!
- Click "Add Level" to create multiple levels:

**Level 1:**
- Name: "Excellent"
- Description: "Complete and accurate explanation with examples"
- Percentage: 100

**Level 2:**
- Name: "Good"
- Description: "Mostly accurate, minor gaps"
- Percentage: 75

**Level 3:**
- Name: "Fair"
- Description: "Partial understanding, some errors"
- Percentage: 50

**Level 4:**
- Name: "Poor"
- Description: "Incomplete or inaccurate"
- Percentage: 25

- Click "Add Rubric"

**Add another criteria:**
- Click "Add Rubric" again
- **Criteria Name: "Clarity"** ← NEW!
- Add similar levels...

### Step 4: Add Submission
- Go to "Submissions & Grading" tab
- Click "Add Submission"
- Enter student info
- Provide answers for each question
- Click "Submit"

### Step 5: Grade Submission ← UPDATED!
- Click "Grade" on the submission

**For each question:**
1. Read student's answer
2. **Select criteria and level** ← NEW!
   - Click on the level that best matches (e.g., "Good - 75%")
   - Do this for each criteria
3. OR enter custom percentage if needed
4. Add personalized feedback
5. Review calculated points

**After grading all questions:**
- Review the total score at the top
- **Click "Save All Grades" button** ← NEW!
- Wait for confirmation: "✓ Grades saved successfully!"

### Step 6: Export Results
- Go back to assignment detail
- Click "Export CSV"
- Open in Excel/Google Sheets

---

## New Grading Example

**Assignment:** Total Points = 100

**Question 1:** 60% of assignment = 60 points
- **Criteria: Accuracy**
  - Selected Level: "Good" (75%)
  - Points: 75% of 60 = 45 points
- **Criteria: Clarity**
  - Selected Level: "Excellent" (100%)
  - Points: 100% of 60 = 60 points
- **Average for question:** (45 + 60) / 2 = 52.5 points

**Question 2:** 40% of assignment = 40 points
- **Criteria: Completeness**
  - Selected Level: "Excellent" (100%)
  - Points: 100% of 40 = 40 points

**Total Score:** 52.5 + 40 = 92.5 / 100 points (92.5%)

---

## Key Differences from Previous Version

### Old Grading:
- One rubric = one level
- Auto-save (immediate)
- Absolute points

### New Grading:
- One rubric = multiple levels per criteria
- **Manual save with button** ← Important!
- Percentage-based with calculation

---

## Tips

1. **Save Early, Save Often:** Remember to click the save button!
2. **100% Total:** Make sure question percentages add up to 100%
3. **Multiple Criteria:** Use different criteria for different aspects (Accuracy, Clarity, Completeness, etc.)
4. **Level Design:** Create 3-5 levels per criteria for best granularity
5. **Descriptions Matter:** Clear level descriptions help with consistent grading

---

## Common Questions

**Q: What if I forget to save?**
A: Changes will be lost. Always click "Save All Grades" before leaving the page.

**Q: Can I edit rubrics after creating them?**
A: Not currently. Create a new rubric if needed.

**Q: What if my percentages don't add to 100%?**
A: You'll see a warning message. It's recommended to adjust them to 100% for clarity.

**Q: Can I use multiple rubric criteria per question?**
A: Yes! This is the new feature. You can evaluate multiple aspects of each answer.

**Q: Do I need to select a rubric level?**
A: No, you can enter a custom percentage directly if preferred.

---

## Troubleshooting

### Text is hard to read in inputs
✅ Fixed! All inputs now have dark text.

### I clicked away and lost my grading
Use the save button before navigating away. Changes are not auto-saved.

### CSV export shows wrong calculations
Ensure all grades are saved before exporting.

### Percentages seem wrong
Remember: percentages are relative to each question's weight, which is relative to assignment total.

---

## Ready to Grade!

You're all set with the new grading system. Enjoy the improved flexibility and control! 🎓

For detailed documentation, see:
- `README.md` - Full documentation
- `CHANGES.md` - Detailed list of all changes
- `FEATURES.md` - Feature documentation

