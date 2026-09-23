import mongoose, { Schema, type Document, type Types } from 'mongoose';
import type { Kit, KitInput } from '@interviewkit/schemas';

export type KitStatus = 'pending' | 'processing' | 'ready' | 'failed';

export interface IPracticeRecord {
  flashcard_id: string;
  confidence: number;
  practiced_at: Date;
}

export interface IKit extends Document {
  userId: Types.ObjectId;
  status: KitStatus;
  step: string;
  progress: number;
  input: KitInput;
  inputHash: string;
  data?: Kit;
  error?: string;
  practiceHistory: IPracticeRecord[];
  createdAt: Date;
  updatedAt: Date;
}

const PracticeRecordSchema = new Schema<IPracticeRecord>(
  {
    flashcard_id: { type: String, required: true },
    confidence: { type: Number, required: true, min: 1, max: 5 },
    practiced_at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const KitDocumentSchema = new Schema<IKit>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'processing', 'ready', 'failed'],
      default: 'pending',
      index: true,
    },
    step: { type: String, default: 'Queued' },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    input: {
      jd: { type: String, required: true },
      company_url: { type: String, required: true },
      days: { type: Number, required: true },
    },
    inputHash: { type: String, required: true, index: true },
    data: { type: Schema.Types.Mixed },
    error: { type: String },
    practiceHistory: [PracticeRecordSchema],
  },
  {
    timestamps: true,
  },
);

// Compound index for fast lookup of existing kits per user
KitDocumentSchema.index({ userId: 1, inputHash: 1 });

export const KitModel = mongoose.model<IKit>('Kit', KitDocumentSchema);
