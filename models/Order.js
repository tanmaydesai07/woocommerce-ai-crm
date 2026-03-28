import mongoose from 'mongoose';

export default mongoose.model('Order', new mongoose.Schema({
  wooOrderId: { type: String, default: null },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  orderNumber: { type: String, required: true },
  products: [{
    name: String,
    quantity: Number,
    price: Number
  }],
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'], default: 'pending' },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'refunded', 'failed'], default: 'pending' },
  shippingAddress: { type: String, default: '' },
  notes: { type: String, default: '' },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}));
