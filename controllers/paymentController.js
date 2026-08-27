const Payment = require('../models/Payment');
const User = require('../models/User');
const products = require('../config/products');

exports.submitPayment = async (req, res, next) => {
  try {
    const { utr, productId } = req.body;
    
    const product = products[productId];
    if (!product) {
      return res.status(400).json({ success: false, message: 'Invalid product ID' });
    }

    const payment = await Payment.create({
      user: req.user.id,
      utr,
      amount: product.amount,
      productId,
    });
    res.status(201).json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
};

exports.getPaymentStatus = async (req, res, next) => {
  try {
    const payments = await Payment.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: payments });
  } catch (error) {
    next(error);
  }
};

exports.getPendingPayments = async (req, res, next) => {
  try {
    const payments = await Payment.find({ status: 'pending' }).populate('user', 'name email');
    res.status(200).json({ success: true, data: payments });
  } catch (error) {
    next(error);
  }
};

exports.approvePayment = async (req, res, next) => {
  try {
    const payment = await Payment.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    
    await User.findByIdAndUpdate(payment.user, { isPremium: true });
    
    res.status(200).json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
};

exports.rejectPayment = async (req, res, next) => {
  try {
    const { adminNotes } = req.body;
    const payment = await Payment.findByIdAndUpdate(req.params.id, { status: 'rejected', adminNotes }, { new: true });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    
    res.status(200).json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
};
