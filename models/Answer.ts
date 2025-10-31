import mongoose, { Schema, model, models } from 'mongoose';

export interface IAnswer {
  _id?: string;
  submissionId: string;
  questionId: string;
  answerText: string;
  selectedRubricId?: string;
  selectedLevelIndex?: number;
  feedback?: string;
  pointsPercentage?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const AnswerSchema = new Schema<IAnswer>(
  {
    submissionId: {
      type: String,
      required: true,
      ref: 'Submission',
    },
    questionId: {
      type: String,
      required: true,
      ref: 'Question',
    },
    answerText: {
      type: String,
      required: true,
    },
    selectedRubricId: {
      type: String,
      ref: 'Rubric',
      default: null,
    },
    selectedLevelIndex: {
      type: Number,
      default: null,
    },
    feedback: {
      type: String,
      default: '',
    },
    pointsPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: true,
  }
);

export const Answer = models.Answer || model<IAnswer>('Answer', AnswerSchema);

