const Razorpay = require('razorpay');
require('dotenv').config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_xxxxxxx',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'xxxxxxx',
});

module.exports = razorpay;
