import mongoose, { Schema, model, models } from 'mongoose';

export interface ISubmission {
  _id?: string;
  assignmentId: string;
  studentName: string;
  studentEmail: string;
  submittedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const SubmissionSchema = new Schema<ISubmission>(
  {
    assignmentId: {
      type: String,
      required: true,
      ref: 'Assignment',
    },
    studentName: {
      type: String,
      required: true,
    },
    studentEmail: {
      type: String,
      required: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const Submission = models.Submission || model<ISubmission>('Submission', SubmissionSchema);

