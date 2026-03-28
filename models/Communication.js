import mongoose from 'mongoose';

export default mongoose.model('Communication', new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  type: { type: String, enum: ['call', 'email', 'meeting', 'note', 'support'], default: 'note' },
  subject: { type: String, required: true },
  notes: { type: String, required: true },
  followUpDate: { type: Date, default: null },
  status: { type: String, enum: ['open', 'follow-up', 'resolved', 'closed'], default: 'open' },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}));
