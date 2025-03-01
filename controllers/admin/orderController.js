const Order= require('../../models/orderSchema')
const ReturnRequest=require("../../models/returnRequestSchema")


module.exports={
      getOrderPage: async (req, res) => {
            try {
                const orders = await Order.find()
                    .sort({ createdAt: -1 })
                    .populate({
                        path: 'userId',
                        select: 'email'
                    });
        
                const formattedOrders = orders.map(order => ({
                    _id: order._id,
                    orderDate: order.createdAt.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    }),
                    userEmail: order.userId?.email || 'Deleted User',
                    status: order.status,
                    totalAmount: order.totalAmount
                }));
        
                res.render("admin/orders", { orders: formattedOrders });
        
            } catch (error) {
                console.error('Error fetching orders:', error);
                res.status(500).render('error', { message: 'Failed to load orders' });
            }
        },
      getReturnOrderPage :async (req, res) => {
            try {
                const page = parseInt(req.query.page) || 1; 
                const limit = 10;
                const skip = (page - 1) * limit;
        
               
                const returnRequests = await ReturnRequest.find({})
                    .sort({ createdAt: -1 }) 
                    .skip(skip)
                    .limit(limit)
                    .populate('orderId') 
                    .populate('productId') 
                    .populate('userId') 
                    .exec();
        
               
                const totalReturnRequests = await ReturnRequest.countDocuments();
        
               
                const totalPages = Math.ceil(totalReturnRequests / limit);
        
               
                res.render("admin/returnOrder", { 
                    returnRequests, 
                    currentPage: page, 
                    totalPages 
                });
            } catch (error) {
                console.error("Error fetching return requests:", error);
                res.status(500).send("Internal Server Error");
            }
        },
        getOrderDetailsPage: async (req, res) => {
            try {
                const orderId = req.params.orderId;
                
                const order = await Order.findById(orderId)
                    .populate({
                        path: 'userId',
                        select: 'email'
                    })
                    .populate({
                        path: 'items.productId',
                        select: 'productName image price discountprice'
                    });
        
                if (!order) {
                    return res.status(404).render('error', { message: 'Order not found' });
                }
        
                const formattedOrder = {
                    _id: order._id,
                    orderDate: order.createdAt.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    }),
                    userEmail: order.userId?.email || 'Deleted User',
                    address: order.address,
                    paymentMethod: order.paymentMethod,
                    status: order.status,
                    totalAmount: order.totalAmount,
                    items: order.items.map(item => ({
                        productName: item.productId.productName,
                        image: item.productId.image?.[0] || null,
                        price: item.price,
                        discountedPrice: item.discountedPrice,
                        quantity: item.quantity,
                        status: item.status
                    })),
                    totalSavings: order.items.reduce((sum, item) => 
                        sum + ((item.price - item.discountedPrice) * item.quantity), 0)
                };
        console.log("===========",order.paymentMethod)
                res.render("admin/orderDetailsPage", { order: formattedOrder });
        
            } catch (error) {
                console.error('Error fetching order details:', error);
                res.status(500).render('error', { 
                    message: error.message || 'Failed to load order details' 
                });
            }
        }  ,
        updateOrderStatus: async (req, res) => {
            try {
                const { orderId } = req.params;
                const { status } = req.body;
                const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
        
                if (!validStatuses.includes(status)) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Invalid status' 
                    });
                }
        
               
                const order = await Order.findById(orderId);
                if (!order) {
                    return res.status(404).json({ 
                        success: false, 
                        message: 'Order not found' 
                    });
                }
                order.status = status;
                if (status === 'Delivered') {
                    order.items.forEach(item => {
                        if (item.status !== 'Cancelled') {
                            item.status = 'Delivered';
                        }
                    });
                }
        
                // Save the updated order
                await order.save();
        
                res.json({ 
                    success: true, 
                    message: 'Order status updated successfully',
                    newStatus: status,
                    order: order  
                });
        
            } catch (error) {
                console.error('Status update error:', error);
                res.status(500).json({ 
                    success: false, 
                    message: error.message || 'Failed to update status' 
                });
            }
        }
}