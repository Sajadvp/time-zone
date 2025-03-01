const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    productName: { 
        type: String,
        required: true 
    },
    description: {
         type: String 
    },
    category: {
     type: mongoose.Schema.Types.ObjectId,
     ref: 'Category',
     required: true
    },
    brand: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Brand',
        required: true
    },
    image: {
         type: Array,
    },
    date: { 
        type: Date 
    },
    stockQuantity: { 
        type: Number,
        required: true 
    },
    price: {
         type: Number 
    },
    specification: {
         type: String 
    },
    status: {
         type: String, 
         default: 'Active' 
    },
    discountprice: { 
        type: Number, 
        default: 0 
    },   
    categoryDiscountprice: { 
        type: Number, 
        default: 0 
    },
    categoryOfferId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CategoryOffer',
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
