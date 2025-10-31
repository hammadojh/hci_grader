import mongoose, { Schema, model, models } from 'mongoose';

export interface ICriteriaEvaluation {
  rubricId: string;
  selectedLevelIndex: number;
  feedback: string;
}

export interface IAnswer {
  _id?: string;
  submissionId: string;
  questionId: string;
  answerText: string;
  criteriaEvaluations: ICriteriaEvaluation[];
  pointsPercentage?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const CriteriaEvaluationSchema = new Schema<ICriteriaEvaluation>({
  rubricId: {
    type: String,
    required: true,
    ref: 'Rubric',
  },
  selectedLevelIndex: {
    type: Number,
    required: true,
  },
  feedback: {
    type: String,
    default: '',
  },
}, { _id: false });

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
    criteriaEvaluations: {
      type: [CriteriaEvaluationSchema],
      default: [],
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

