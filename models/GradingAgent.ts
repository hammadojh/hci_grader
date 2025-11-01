import mongoose, { Schema, model, models } from 'mongoose';

export interface IGradingAgent {
  _id?: string;
  questionId: string;
  name: string; // e.g., "g1", "g2", "g3"
  color: string; // hex color code for visual distinction
  model?: string; // model to use (e.g., "openai/gpt-4o-mini", "google/gemini-pro-1.5", "anthropic/claude-3-haiku")
  createdAt?: Date;
  updatedAt?: Date;
}

const GradingAgentSchema = new Schema<IGradingAgent>(
  {
    questionId: {
      type: String,
      required: true,
      ref: 'Question',
    },
    name: {
      type: String,
      required: true,
    },
    color: {
      type: String,
      required: true,
    },
    model: {
      type: String,
      required: false,
      default: 'openai/gpt-5',
    },
  },
  {
    timestamps: true,
  }
);

// Add compound unique index to prevent duplicate agents for the same question
GradingAgentSchema.index({ questionId: 1, name: 1 }, { unique: true });

export const GradingAgent = models.GradingAgent || model<IGradingAgent>('GradingAgent', GradingAgentSchema);

