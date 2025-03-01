const User=require("../../models/userSchema")
const Wallet=require("../../models/walletSchema")
const Product=require("../../models/productSchema")
const Order=require("../../models/orderSchema")
const ReturnRequest = require("../../models/returnRequestSchema");


module.exports = {
    approveReturn: async (req, res) => {
        try {
            const requestId = req.params.id;
            const returnRequest = await ReturnRequest.findById(requestId).populate('orderId userId productId');
    
            if (!returnRequest) {
                return res.status(404).json({ success: false, message: 'Return request not found' });
            }
    
            if (returnRequest.status !== 'Pending') {
                return res.status(400).json({ success: false, message: 'Request is already processed' });
            }
    
            // Update return request status
            returnRequest.status = 'Approved';
            await returnRequest.save();
    
            // Increase product stock
            const product = await Product.findById(returnRequest.productId._id);
            if (product) {
                product.stockQuantity += 1; // Increase stock
                await product.save();
            }
    
            const user = await User.findById(returnRequest.userId._id);
            if (user) {
                let wallet = await Wallet.findOne({ user: user._id });
                if (!wallet) {
                    wallet = new Wallet({ user: user._id, balance: 0 });
                }
                
                // Add the refund transaction
                wallet.transactions.push({
                    transaction_id: `REFUND-${Date.now()}`,
                    amount: returnRequest.orderId.totalAmount,
                    type: 'credit',
                    description: `Refund for order ${returnRequest.orderId._id}`
                });
                
                wallet.balance += returnRequest.orderId.totalAmount;
                await wallet.save();
            }
    
            res.status(200).json({ success: true, message: 'Return request approved successfully' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    },
    
    rejectReturn: async (req, res) => {
        try {
            const { requestId, rejectReason } = req.body;
            const returnRequest = await ReturnRequest.findById(requestId);
    
            if (!returnRequest) {
                return res.status(404).json({ success: false, message: 'Return request not found' });
            }
    
            if (returnRequest.status !== 'Pending') {
                return res.status(400).json({ success: false, message: 'Request is already processed' });
            }
    
            // Update return request status and save rejection reason
            returnRequest.status = 'Rejected';
            returnRequest.rejectReason = rejectReason;
            await returnRequest.save();
    
            res.status(200).json({ success: true, message: 'Return request rejected successfully', rejectReason });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    },
       returnManagment: async (req, res) => {
    try {
        const returns = await ReturnRequest.find()
            .populate('orderId')
            .populate('productId')
            .populate('userId')
            .sort({ createdAt: -1 });
        
        res.render("admin/returnManagment", { returns });
    } catch (error) {
        console.error('Error in return management:', error);
        res.status(500).render('error', { 
            message: 'Error loading return management page' 
        });
    }
}
    };
    
