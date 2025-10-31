import mongoose, { Schema, model, models } from 'mongoose';

export interface IRubricLevel {
  name: string;
  description: string;
  percentage: number;
}

export interface IRubric {
  _id?: string;
  questionId: string;
  criteriaName: string;
  levels: IRubricLevel[];
  createdAt?: Date;
  updatedAt?: Date;
}

const RubricLevelSchema = new Schema<IRubricLevel>({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  percentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
}, { _id: false });

const RubricSchema = new Schema<IRubric>(
  {
    questionId: {
      type: String,
      required: true,
      ref: 'Question',
    },
    criteriaName: {
      type: String,
      required: true,
    },
    levels: {
      type: [RubricLevelSchema],
      required: true,
      validate: {
        validator: function(levels: IRubricLevel[]) {
          return levels && levels.length >= 1;
        },
        message: 'A rubric must have at least one level',
      },
    },
  },
  {
    timestamps: true,
  }
);

export const Rubric = models.Rubric || model<IRubric>('Rubric', RubricSchema);
