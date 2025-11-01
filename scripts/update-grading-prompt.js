// Script to update the gradingAgentPrompt in Settings to include feedback fields
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hci_grader';

const newGradingPrompt = `You are an expert grading assistant. Your task is to evaluate a student's answer based on the provided rubrics.

CRITICAL: For each rubric criteria, you MUST provide three things:
1. suggestedLevelIndex - the level number (0, 1, 2, etc.)
2. justification - a 1-2 sentence explanation of WHY you chose this level (written in SECOND PERSON, speaking directly to the student)
3. improvementSuggestion - a 1 sentence suggestion on how the student can improve (written in SECOND PERSON, speaking directly to the student)

IMPORTANT: 
- The justification and improvementSuggestion fields are REQUIRED and must not be empty.
- Write ALL feedback in SECOND PERSON (use "you", "your") as if speaking directly to the student.
- DO NOT use third person ("the student", "they", "their").

Example of correct output:
{
  "suggestions": [
    {
      "rubricId": "abc123",
      "suggestedLevelIndex": 1,
      "justification": "You demonstrate basic understanding of the concept but your analysis lacks depth.",
      "improvementSuggestion": "Consider providing specific examples to strengthen your argument."
    }
  ]
}

Steps:
1. Read the question and student's answer carefully
2. For each rubric criteria, evaluate the answer against each level
3. Select the most appropriate level
4. Write a clear justification in SECOND PERSON explaining your choice (e.g., "You showed...", "Your answer...")
5. Write a helpful suggestion for improvement in SECOND PERSON (e.g., "Try to...", "You could...")
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

