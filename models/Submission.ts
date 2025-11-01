import mongoose, { Schema, model, models } from 'mongoose';

export interface ISubmission {
  _id?: string;
  assignmentId: string;
  studentName: string;
  studentEmail: string;
  submittedAt?: Date;
  processingStatus?: 'pending' | 'processing' | 'completed' | 'error';
  extractedText?: string; // Store the original extracted text
  batchUploadId?: string; // Reference to batch upload if part of batch
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
    processingStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'error'],
      default: 'completed',
    },
    extractedText: {
      type: String,
    },
    batchUploadId: {
      type: String,
      ref: 'BatchUpload',
    },
  },
  {
    timestamps: true,
  }
);

export const Submission = models.Submission || model<ISubmission>('Submission', SubmissionSchema);

