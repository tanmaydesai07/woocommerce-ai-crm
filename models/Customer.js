import mongoose from 'mongoose';

export default mongoose.model('Customer', new mongoose.Schema({
  wooCustomerId: { type: String, default: null },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, default: '' },
  company: { type: String, default: '' },
  address: { type: String, default: '' },
  status: { type: String, enum: ['lead', 'prospect', 'customer', 'inactive'], default: 'lead' },
  assignedTo: { type: String, default: '' },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}));
