
const mongoose =require('mongoose')

const CategoryOfferSchema = new mongoose.Schema({
categoryId:{
       type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
},
  discountPercentage: {
    type: Number,
    required: true  
  },
  expiryDate: {
    type: Date,  
    required: true
  }
    
})

const CategoryOffer=mongoose.model('CategoryOffer',CategoryOfferSchema)
module.exports=CategoryOffer