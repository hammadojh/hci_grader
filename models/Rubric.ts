import mongoose, { Schema, model, models } from 'mongoose';

export interface IRubric {
  _id?: string;
  questionId: string;
  criteria: string;
  points: number;
  description: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const RubricSchema = new Schema<IRubric>(
  {
    questionId: {
      type: String,
      required: true,
      ref: 'Question',
    },
    criteria: {
      type: String,
      required: true,
    },
    points: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Rubric = models.Rubric || model<IRubric>('Rubric', RubricSchema);

