const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');

module.exports={
      getHelpCenter:async(req,res)=>{
            try {
                res.render("user/helpCenter") 
            } catch (error) {
                  
            }
      }
}