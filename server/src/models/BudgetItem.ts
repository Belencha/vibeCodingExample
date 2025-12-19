import mongoose, { Document, Schema } from 'mongoose';

export interface IBudgetItem extends Document {
  year: number;
  category: string; // 'income' | 'spending'
  type: string; // e.g., 'pensions', 'social_security', 'taxes', 'eu_funds', etc.
  amount: number; // in euros
  description: string;
  source?: string; // URL or source of the data
  createdAt: Date;
  updatedAt: Date;
}

const BudgetItemSchema: Schema = new Schema(
  {
    year: {
      type: Number,
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      enum: ['income', 'spending'],
      index: true,
    },
    type: {
      type: String,
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    source: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
BudgetItemSchema.index({ year: 1, category: 1 });
BudgetItemSchema.index({ type: 1, year: 1 });

export default mongoose.model<IBudgetItem>('BudgetItem', BudgetItemSchema);

