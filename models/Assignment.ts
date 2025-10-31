import mongoose, { Schema, model, models } from 'mongoose';

export interface IAssignment {
  _id?: string;
  title: string;
  description: string;
  totalPoints: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const AssignmentSchema = new Schema<IAssignment>(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    totalPoints: {
      type: Number,
      required: true,
      default: 100,
    },
  },
  {
    timestamps: true,
  }
);

export const Assignment = models.Assignment || model<IAssignment>('Assignment', AssignmentSchema);

