const mongoose = require("mongoose");
const {Schema }= mongoose;


const addressSchema = new Schema({
    userId:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    address:[{
        addressType:{
            type:String,
            required:true
        },
        name:{
            type:String,
            requied:true,
        },
        city:{
            type:String,
            requied:true,
        },
        landMark:{
            type:String,
            requied:true,
        },
        state:{
            type:String,
            requied:true,
        },
        pincode:{
            type:Number,
            requied:true,
        },
        phone:{
            type:String,
            requied:true,
        },
       altPhone:{
            type:String,
            requied:true,
        },

    }]
})

const Address = mongoose.model("Address",addressSchema);

module.exports=Address;