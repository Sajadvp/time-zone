
const mongoose =require('mongoose')

const CouponSchema= new mongoose.Schema({
  couponCode: {
    type: String,
    required: true,
    unique: true
  },
  minPurchaseAmount: {
    type: Number,
    required: true
  },
  discountAmount: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  expiryDate: {
    type: Date,
    required: true
  }
    
})

const Coupon=mongoose.model('Coupon',CouponSchema)
module.exports=Coupon