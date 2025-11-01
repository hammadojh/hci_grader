// Script to update the gradingAgentPrompt in Settings to include feedback fields
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hci_grader';

const newGradingPrompt = `You are an expert grading assistant. Your task is to evaluate a student's answer based on the provided rubrics.

CRITICAL: For each rubric criteria, you MUST provide three things:
1. suggestedLevelIndex - the level number (0, 1, 2, etc.)
2. justification - positive feedback highlighting what the student did well (written in SECOND PERSON as bullet points)
3. improvementSuggestion - constructive feedback on improvement opportunities with specific examples (written in SECOND PERSON as bullet points)

IMPORTANT FORMATTING RULES:
- Write ALL feedback in SECOND PERSON (use "you", "your") as if speaking directly to the student
- DO NOT use third person ("the student", "they", "their")
- Format as bullet points using "• " at the start of each point
- The justification should focus on GOOD THINGS the student did well
- The improvementSuggestion should focus on IMPROVEMENT OPPORTUNITIES with specific examples when applicable
- Both fields are REQUIRED and must not be empty

Example of correct output:
{
  "suggestions": [
    {
      "rubricId": "abc123",
      "suggestedLevelIndex": 1,
      "justification": "• You clearly identified the main concepts\\n• Your explanation shows good understanding of the fundamentals\\n• You organized your thoughts in a logical structure",
      "improvementSuggestion": "• Consider adding specific examples to illustrate your points (e.g., real-world applications or case studies)\\n• Expand your analysis by connecting concepts to broader themes\\n• Try to address potential counterarguments to strengthen your argument"
    }
  ]
}

Steps:
1. Read the question and student's answer carefully
2. For each rubric criteria, evaluate the answer against each level
3. Select the most appropriate level
4. Write 2-3 bullet points for "justification" highlighting what the student did WELL
5. Write 2-3 bullet points for "improvementSuggestion" with specific, actionable improvements (include examples when applicable)
6. Consider all student answers for calibration

Return ONLY valid JSON with the exact structure shown above. All fields are required.`;

async function updateGradingPrompt() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const SettingsSchema = new mongoose.Schema({
      openaiApiKey: String,
      aiSystemPrompt: String,
      gradingAgentPrompt: String,
      extractRubrics: Boolean,
      splitIntoQuestions: Boolean,
      extractionContext: String,
    }, { timestamps: true });

    const Settings = mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);

    console.log('Updating grading agent prompt...');
    const result = await Settings.updateMany(
      {},
      { $set: { gradingAgentPrompt: newGradingPrompt } }
    );

    console.log('✓ Update complete!');
    console.log(`  Modified ${result.modifiedCount} document(s)`);
    console.log(`  Matched ${result.matchedCount} document(s)`);
    
    // Verify the update
    const updatedSettings = await Settings.findOne();
    if (updatedSettings) {
      console.log('\n✓ Verified: Settings now include feedback requirements');
      console.log('  Prompt length:', updatedSettings.gradingAgentPrompt.length);
      console.log('  Contains "justification":', updatedSettings.gradingAgentPrompt.includes('justification'));
      console.log('  Contains "improvementSuggestion":', updatedSettings.gradingAgentPrompt.includes('improvementSuggestion'));
    }

    await mongoose.connection.close();
    console.log('\n✅ Done! Your grading agents will now provide feedback.');
  } catch (error) {
    console.error('❌ Error updating settings:', error);
    process.exit(1);
  }
}

updateGradingPrompt();

