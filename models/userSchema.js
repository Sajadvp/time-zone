const mongoose = require("mongoose");
const { type } = require("os");
const {Schema}=mongoose;


const userSchema = new Schema ({
    
    name:{
        type:String,
        required:true,
    },
    email:{
        type:String,
        required:true,
        unique:true,
    },
    phone:{
        type:String,
        required:false,
        unique:false,
        sparse:true,
        default:null,
    },
    googleId: {
        type: String,
        unique: true,
        
    },
    address:[{
        street:String,
        city:String,
        state:String,
        pincode:String,
        country:String,
        phone:Number,
        addressType:String

    }],
    

    password:{
        type:String,
        required:false,

    },
    isBlocked:{
        type:Boolean,
        default:false,
    },
    isAdmin:{
        type:Boolean,
        default:false,
    },
    cart:[{
        type:Schema.Types.ObjectId,
        ref:"Cart"
    }],
    wallet:{
        type:Number,
        default:0,
    },
    wishlist:[{
        type:Schema.Types.ObjectId,
        ref:"Wishlist"
    }],
    orderHistory:[{
        type:Schema.Types.ObjectId,
        ref:"Order"
    }],
    createdOn :{
        type:Date,
        default:Date.now,
    },
    appliedCoupons: {
        type: [String], // Stores used coupon codes
        default: []
    },
    referalCode:{
        type:String,
        // required:true

    },
    redeemed:{
        type:Boolean,
        // default:false
    },
    redeemedUsers:[{
        type:Schema.Types.ObjectId,
        ref:"User",
        // required:true
    }],
    searchHistory:[{
        category:{
            type:Schema.Types.ObjectId,
            ref:"Category"
        },
        brand:{
            type:String
        },
        searchOn:{
            type:Date,
            default:Date.now,
        }

    }]
})


const User = mongoose.model("User",userSchema);
module.exports=User;