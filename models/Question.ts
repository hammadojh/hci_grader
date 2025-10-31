import mongoose, { Schema, model, models } from 'mongoose';

export interface IQuestion {
  _id?: string;
  assignmentId: string;
  questionText: string;
  questionNumber: number;
  maxPoints: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const QuestionSchema = new Schema<IQuestion>(
  {
    assignmentId: {
      type: String,
      required: true,
      ref: 'Assignment',
    },
    questionText: {
      type: String,
      required: true,
    },
    questionNumber: {
      type: Number,
      required: true,
    },
    maxPoints: {
      type: Number,
      required: true,
      default: 100,
    },
  },
  {
    timestamps: true,
  }
);

export const Question = models.Question || model<IQuestion>('Question', QuestionSchema);

