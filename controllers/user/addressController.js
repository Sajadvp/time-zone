const User = require("../../models/userSchema");
const mongoose = require("mongoose");

module.exports = {
    addAddress : async (req, res) => {
        try {
          console.log("Incoming request body:", req.body);
          const { phone, street, city, state, pincode, country, addressType } = req.body;
          const userId = req.session.user?._id;
      
          if (!userId) return res.redirect("/login");
      
          const user = await User.findById(userId);
          if (!user) return res.redirect("/login");
      
          if (user.address.length >= 3) {
            return res.status(400).json({ error: "You can only save up to 3 addresses." });
          }
      
          // Validation Patterns
          const textPattern = /^[A-Za-z\s]{3,}$/;
          const phonePattern = /^[6-9]\d{9}$/;
          const pincodePattern = /^\d{6}$/;
      
          if (!textPattern.test(street) || !textPattern.test(city) || !textPattern.test(state) || !textPattern.test(country)) {
            return res.status(400).json({ error: "Street, City, State, and Country must contain only letters and be at least 3 characters long." });
          }
      
          if (!phonePattern.test(phone)) {
            return res.status(400).json({ error: "Phone number must be exactly 10 digits and start with 6 or greater." });
          }
      
          if (!pincodePattern.test(pincode)) {
            return res.status(400).json({ error: "Pincode must be exactly 6 digits." });
          }
      
          user.address.push({ street, city, state, pincode, country, phone, addressType });
          await user.save();
      
          req.session.user = user;
          res.redirect("/userProfile");
        } catch (error) {
          console.error("Error adding address:", error);
          res.status(500).json({ error: "Internal Server Error." });
        }
      },

    deleteAddress: async (req, res) => {
        try {
            const {addressId,path} = req.query;
            console.log("==========sdsd======",addressId,path);
            
            const userId = req.session.user?._id;

            if (!userId) {
                return res.redirect('/login'); // Redirect to login if user is not logged in
            }

            const user = await User.findOneAndUpdate(
                { _id: userId, "address._id": addressId },
                { $pull: { address: { _id: addressId } } },
                { new: true }
            );

            if (!user) {
                return res.redirect('/login'); // Redirect to login if user is not found
            }

            console.log('Address deleted successfully');
            if(path=="checkOut"){
               return res.redirect('/checkout');
            }else{
                res.redirect('/userProfile');   
            }
            
        } catch (error) {
            console.error('Error deleting address:', error);
            res.status(500).send('Error deleting address');
        }
    },

    getEditAddress: async (req, res) => {
        try {
            const addressId = req.params.id;
            const user = req.session.user;

            

            if (!user) {
                return res.redirect('/login'); // Redirect to login if user is not found
            }

            console.log("User Data:", user);
            console.log("Address ID:", addressId);

            if (!user.address || !Array.isArray(user.address)) {
                return res.status(404).send("User has no address data");
            }

            const address = user.address.find(addr => addr._id.toString() === addressId);
            console.log(address, "%%%%%%%%%%%%%");

            if (!address) {
                return res.status(404).send("Address not found");
            }

            res.render("user/editAddress", { address, user });
        } catch (error) {
            console.error(error);
            res.status(500).send("Internal server error");
        }
    },

    updateAddress: async (req, res) => {
        try {
            const addressId = req.params.id;
            const userId = req.session.user?._id;

            if (!userId) {
                return res.redirect('/login'); // Redirect to login if user is not logged in
            }

            const { phone, street, city, state, pincode, country, addressType } = req.body;

            console.log('Request body:', req.body);
            console.log('Address ID:', addressId);
            console.log('User ID:', userId);

            if (!userId || !addressId) {
                return res.status(400).send('User ID or Address ID is missing.');
            }

            const user = await User.findOneAndUpdate(
                { _id: userId, "address._id": addressId },
                {
                    $set: {
                        "address.$.phone": phone,
                        "address.$.street": street,
                        "address.$.city": city,
                        "address.$.state": state,
                        "address.$.pincode": pincode,
                        "address.$.country": country,
                        "address.$.addressType": addressType,
                    },
                },
                { new: true }
            );

            if (!user) {
                return res.redirect('/login'); // Redirect to login if user is not found
            }

            console.log('Updated User:', user);
            req.session.user = user;

            res.redirect('/userProfile');
        } catch (error) {
            console.error('Error updating address:', error);
            res.status(500).send('Internal Server Error.');
        }
    }
};
