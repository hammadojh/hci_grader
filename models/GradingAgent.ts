import mongoose, { Schema, model, models } from 'mongoose';

export interface IGradingAgent {
  _id?: string;
  questionId: string;
  name: string; // e.g., "g1", "g2", "g3"
  color: string; // hex color code for visual distinction
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
  },
  {
    timestamps: true,
  }
);

export const GradingAgent = models.GradingAgent || model<IGradingAgent>('GradingAgent', GradingAgentSchema);

