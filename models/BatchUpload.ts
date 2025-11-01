import mongoose, { Schema, model, models } from 'mongoose';

export interface IFileUploadItem {
  fileName: string;
  fileSize: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  currentStep?: 'extracting_text' | 'extracting_metadata' | 'parsing_answers' | 'creating_submission';
  progress?: number; // 0-100
  submissionId?: string;
  studentName?: string;
  studentEmail?: string;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface IBatchUpload {
  _id?: string;
  assignmentId: string;
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  status: 'pending' | 'processing' | 'completed' | 'partial' | 'failed';
  files: IFileUploadItem[];
  createdAt?: Date;
  updatedAt?: Date;
}

const FileUploadItemSchema = new Schema({
  fileName: {
    type: String,
    required: true,
  },
  fileSize: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'error'],
    default: 'pending',
  },
  currentStep: {
    type: String,
    enum: ['extracting_text', 'extracting_metadata', 'parsing_answers', 'creating_submission'],
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  submissionId: {
    type: String,
    ref: 'Submission',
  },
  studentName: String,
  studentEmail: String,
  error: String,
  startedAt: Date,
  completedAt: Date,
}, { _id: false });

const BatchUploadSchema = new Schema<IBatchUpload>(
  {
    assignmentId: {
      type: String,
      required: true,
      ref: 'Assignment',
    },
    totalFiles: {
      type: Number,
      required: true,
    },
    completedFiles: {
      type: Number,
      default: 0,
    },
    failedFiles: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'partial', 'failed'],
      default: 'pending',
    },
    files: [FileUploadItemSchema],
  },
  {
    timestamps: true,
  }
);

export const BatchUpload = models.BatchUpload || model<IBatchUpload>('BatchUpload', BatchUploadSchema);

