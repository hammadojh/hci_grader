import { Schema, model, models } from 'mongoose';

export interface ISettings {
  _id?: string;
  openaiApiKey?: string; // Optional - kept for backward compatibility
  openRouterApiKey: string; // Required - primary API for all AI features
  aiSystemPrompt: string;
  gradingAgentPrompt: string;
  // Default models for grading agents
  defaultModel1?: string;
  defaultModel2?: string;
  defaultModel3?: string;
  // AI Extraction preferences
  extractRubrics?: boolean;
  splitIntoQuestions?: boolean;
  extractionContext?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const SettingsSchema = new Schema<ISettings>(
  {
    openaiApiKey: {
      type: String,
      required: false,
    },
    openRouterApiKey: {
      type: String,
      required: true,
    },
    defaultModel1: {
      type: String,
      required: false,
      default: 'openai/gpt-5',
    },
    defaultModel2: {
      type: String,
      required: false,
      default: 'google/gemini-2.5-pro',
    },
    defaultModel3: {
      type: String,
      required: false,
      default: 'anthropic/claude-4.5-sonnet',
    },
    aiSystemPrompt: {
      type: String,
      required: true,
      default: `You are an expert educational assessment designer. Your role is to help instructors create comprehensive, fair, and well-structured rubrics for grading assignments.

When creating rubrics:
1. Consider the learning objectives and what skills/knowledge are being assessed
2. Create clear, measurable criteria that avoid ambiguity
3. Define distinct performance levels with specific descriptors
4. Assign appropriate weights based on the importance of each criterion
5. Use language that is clear to both instructors and students
6. Ensure the rubric promotes consistency in grading

For each criterion, provide:
- A clear name that identifies what is being assessed
- Multiple performance levels (typically 3-5 levels)
- Specific, observable descriptions for each level
- Percentage weights that reflect the relative importance

Always aim for rubrics that are practical, fair, and promote learning.`,
    },
    gradingAgentPrompt: {
      type: String,
      required: true,
      default: `You are an expert grading assistant. Your task is to evaluate a student's answer based on the provided rubrics.

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

Return ONLY valid JSON with the exact structure shown above. All fields are required.`,
    },
    extractRubrics: {
      type: Boolean,
      default: true,
    },
    splitIntoQuestions: {
      type: Boolean,
      default: true,
    },
    extractionContext: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export const Settings = models.Settings || model<ISettings>('Settings', SettingsSchema);

