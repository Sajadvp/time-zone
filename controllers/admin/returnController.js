const User=require("../../models/userSchema")
const Wallet=require("../../models/walletSchema")
const Product=require("../../models/productSchema")
const Order=require("../../models/orderSchema")
const ReturnRequest = require("../../models/returnRequestSchema");


module.exports = {
  approveReturn: async (req, res) => {
    try {
        const requestId = req.params.id;
        const returnRequest = await ReturnRequest.findById(requestId)
            .populate('orderId userId');

        if (!returnRequest) {
            return res.status(404).json({ success: false, message: 'Return request not found' });
        }

        if (returnRequest.status !== 'Pending') {
            return res.status(400).json({ success: false, message: 'Request is already processed' });
        }

        // Update return request status
        returnRequest.status = 'Approved';
        await returnRequest.save();

        const order = await Order.findById(returnRequest.orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Update stock for all items in the order
        const stockUpdates = order.items.map(async (item) => {
            const product = await Product.findById(item.productId);
            if (product) {
                product.stockQuantity += item.quantity;
                await product.save();
            }
            item.status = 'Return Approved';
            return {
                productName: item.productName,
                quantity: item.quantity,
                refundAmount: item.discountedPrice * item.quantity
            };
        });

        // Wait for all stock updates to complete
        const updatedItems = await Promise.all(stockUpdates);
        
        // Update overall order status
        order.status = 'Approved';
        await order.save();

        // Calculate total refund amount
        const totalRefundAmount = updatedItems.reduce(
            (sum, item) => sum + item.refundAmount,
            0
        );

        // Handle wallet update
        const user = await User.findById(returnRequest.userId._id);
        if (user) {
            let wallet = await Wallet.findOne({ user: user._id });
            if (!wallet) {
                wallet = new Wallet({ user: user._id, balance: 0 });
            }
            
            // Add refund transaction for the entire order
            wallet.transactions.push({
                transaction_id: `REFUND-${Date.now()}`,
                amount: totalRefundAmount,
                type: 'credit',
                description: `Refund for order ${returnRequest.orderId._id} (${order.items.length} items)`
            });
            
            wallet.balance += totalRefundAmount;
            await wallet.save();
        }

        res.status(200).json({ 
            success: true, 
            message: 'Return request approved successfully',
            data: {
                orderId: order._id,
                returnedItems: updatedItems,
                totalRefundAmount: totalRefundAmount,
                totalItems: order.items.length
            }
        });
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
    
