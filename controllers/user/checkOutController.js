const Product=require('../../models/productSchema')
const User=require('../../models/userSchema')
const Cart=require('../../models/cartSchema')
const Coupon=require("../../models/couponSchema")

module.exports={
    getCheckout: async (req, res) => {
        try {
            const user = req.session.user;
            const userId = req.session.user?._id;
            console.log(userId);
            
            // Fetch cart items populated with product details
            const cartItems = await Cart.findOne({ userId: userId }).populate({ path: 'products.productId', model: 'Product' });
    
            // Fetch the user details along with the address
            const userAdd = await User.findOne({ _id: userId });
    
            // Get the address from the user document
            const addresses = userAdd ? userAdd.address : [];
    
            // Fetch all coupons
            const currentDate = new Date();
            const availableCoupons = await Coupon.find({ expiryDate: { $gt: currentDate } });
            console.log(addresses, '=======user===========');
    
            if (!user) {
                // Handle case where user data is not available in session
                return res.redirect('/login');
            }
            
            // Render the checkout page and pass user, cart items, addresses, and valid coupons
            res.render('user/checkOut', { user, cartItems, addresses,availableCoupons });
        } catch (error) {
            console.error('Error fetching user data for checkout:', error);
            res.status(500).send('Internal Server Error');
        }
    },
    
        checkout: async (req, res) => {
            try {
                // Get the selected address and payment method from the request body
                const { addressId, paymentMethod } = req.body;
    
                // Find the user's cart and user details
                const cart = await Cart.findOne({ userId: req.user._id }).populate('products.productId');
                const user = await User.findById(req.user._id);
    
                // If cart or user is not found, return an error
                if (!cart || !user) {
                    return res.redirect('/login');
                }
    
                // Calculate the total amount based on the cart
                const totalAmount = cart.products.reduce((acc, item) => {
                    const price = item.productId.discountprice || item.productId.price;
                    return acc + price * item.quantity;
                }, 0);
    
                // Create the order
                const order = new Order({
                    userId: req.user._id,
                    products: cart.products,
                    totalAmount,
                    address: user.addresses.id(addressId), // Assuming `addresses` is an array of addresses
                    paymentMethod,
                    status: 'Pending',
                });
    
                // Save the order to the database
                await order.save();
    
                // Clear the user's cart after the order is placed
                await Cart.findOneAndUpdate({ userId: req.user._id }, { $set: { products: [] } });
    
                // Send a success response with the order details
                res.json({ message: 'Order placed successfully.', order });
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: 'Server error' });
            }
        }
}