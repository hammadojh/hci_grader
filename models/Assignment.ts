import mongoose, { Schema, model, models } from 'mongoose';

export interface IAssignment {
  _id?: string;
  title: string;
  description: string;
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
  },
  {
    timestamps: true,
  }
);

export const Assignment = models.Assignment || model<IAssignment>('Assignment', AssignmentSchema);

