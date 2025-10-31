import { Schema, model, models } from 'mongoose';

export interface ISettings {
    _id?: string;
    openaiApiKey: string;
    aiSystemPrompt: string;
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
    },
    {
        timestamps: true,
    }
);

export const Settings = models.Settings || model<ISettings>('Settings', SettingsSchema);

