const mongoose = require('mongoose');
const { Schema } = mongoose;

const brandSchema = new Schema({
   brandName: {
     type: String,
     required: [true, 'Brand name is required']
   },
   Image: {
     type: [String],
     required: true
   },
   isActive: {
     type: Boolean,
     default: true
   },
   createdAt: {
     type: Date,
     default: Date.now
   },
   description: {
     type: String,
     required: [true, 'Description is required'],
     minlength: [3, 'Description must be at least 3 characters long'],
     maxlength: [500, 'Description cannot exceed 500 characters']
   },
});

const Brand = mongoose.model('Brand', brandSchema); // Correct
module.exports = Brand;
