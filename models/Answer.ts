import mongoose, { Schema, model, models } from 'mongoose';

export interface IAnswer {
  _id?: string;
  submissionId: string;
  questionId: string;
  answerText: string;
  selectedRubricId?: string;
  feedback?: string;
  pointsAwarded?: number;
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
    feedback: {
      type: String,
      default: '',
    },
    pointsAwarded: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const Answer = models.Answer || model<IAnswer>('Answer', AnswerSchema);

