import { Schema, model, models } from 'mongoose';

export interface ISettings {
  _id?: string;
  openaiApiKey: string;
  aiSystemPrompt: string;
  gradingAgentPrompt: string;
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
      required: true,
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

For each criteria in the rubric, you must select the most appropriate level based on the student's answer quality.

You should:
1. Carefully read the question and the student's answer
2. Compare the answer against each rubric criteria
3. Select the level that best matches the answer's quality for each criteria
4. Consider all answers from other students for context (to calibrate your grading)

Return your evaluation as a JSON object with the following structure:
{
  "suggestions": [
    {
      "rubricId": "rubric_id_here",
      "suggestedLevelIndex": 0
    }
  ]
}

Be objective and consistent in your evaluation.`,
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

