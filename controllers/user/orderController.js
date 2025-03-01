const { model } = require("mongoose")
const User=require("../../models/userSchema")
const Order=require("../../models/orderSchema")
const Cart= require("../../models/cartSchema")
const Product=require("../../models/productSchema")
const ReturnRequest = require("../../models/returnRequestSchema")
const Razorpay = require("razorpay")
const crypto = require('crypto');
const Wallet = require("../../models/walletSchema")
const PDFDocument = require('pdfkit');
const fs = require('fs');


module.exports = {
    getOrderPage: async (req, res) => {
        try {
            const userId = req.session.user?._id;
            if (!userId) {
                return res.redirect('/login');
            }
    
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).render('error', { message: 'User not found' });
            }
    
            const orders = await Order.find({ userId })
                .sort({ createdAt: -1 })
                .populate({
                    path: 'items.productId',
                    select: 'productName image price discountprice'
                });
    
            if (!orders) {
                return res.render('user/order', { user, orders: [] });
            }
    
            // Fetch return requests for the user
            const returnRequests = await ReturnRequest.find({ userId });
    
            // Map orders and include return request status
            const ordersWithReturnStatus = orders.map(order => {
                const orderWithStatus = order.toObject();
                orderWithStatus.items = orderWithStatus.items.map(item => {
                    const returnRequest = returnRequests.find(req => 
                        req.orderId.toString() === order._id.toString() && 
                        req.productId.toString() === item.productId._id.toString()
                    );
                    item.returnStatus = returnRequest ? returnRequest.status : null;
                    return item;
                });
                return orderWithStatus;
            });
    
            res.render("user/order", {
                user,
                orders: ordersWithReturnStatus
            });
    
        } catch (error) {
            console.error('Error fetching orders:', error);
            res.status(500).render('error', { 
                message: error.message || 'Failed to load orders' 
            });
        }
    },
placeOrder :async (req, res) => {
        const { address, paymentMethod } = req.body;
        const userId = req.session?.user?._id;
    
        if (!userId) {
            return res.status(401).json({ success: false, message: 'User not logged in' });
        }
    
        try {
            const cart = await Cart.findOne({ userId }).populate('products.productId');
    
            if (!cart?.products?.length) {
                return res.status(400).json({ success: false, message: 'Cart is empty' });
            }
    
            // Check stock availability
            const insufficientStockProducts = [];
            for (const item of cart.products) {
                const product = item.productId;
                if (!product) {
                    return res.status(404).json({ 
                        success: false, 
                        message: `Product not found: ${item._id}` 
                    });
                }
                if (item.quantity > product.stockQuantity) {
                    insufficientStockProducts.push({
                        productId: product._id,
                        productName: product.productName,
                        available: product.stockQuantity,
                        requested: item.quantity
                    });
                }
            }
    
            if (insufficientStockProducts.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Insufficient stock for some products',
                    insufficientItems: insufficientStockProducts
                });
            }
    
            // Calculate total amount with proper discount handling
            let totalAmount = cart.products.reduce((acc, item) => {
                const product = item.productId;
                const originalPrice = Number(product.price) || 0;
                const discountPrice = Number(product.discountprice) || 0;
                const categoryDiscountPrice = Number(product.categoryDiscountprice) || 0;
    
                // Determine the best price (lowest among original, discount, and category discount)
                let bestPrice = originalPrice;
                if (discountPrice > 0 && (categoryDiscountPrice === 0 || discountPrice < categoryDiscountPrice)) {
                    bestPrice = discountPrice;
                } else if (categoryDiscountPrice > 0 && (discountPrice === 0 || categoryDiscountPrice < discountPrice)) {
                    bestPrice = categoryDiscountPrice;
                }
    
                return acc + (bestPrice * item.quantity);
            }, 0);
    
            // Check if a coupon is applied and subtract the discount amount
            let appliedCouponCode = null;
            if (req.session.coupon) {
                const coupon = req.session.coupon;
                totalAmount -= coupon.discountAmount;
                appliedCouponCode = coupon.couponCode; // Store the coupon code
                console.log(`Coupon applied: Discount of ₹${coupon.discountAmount} applied. New total: ₹${totalAmount}`);
            }
    
            // Handle wallet payment
            if (paymentMethod == "Wallet") {
                console.log("hereeeeeeeeeeeeeeeeeeeeeeeeee")
                const wallet = await Wallet.findOne({ user: userId });
                if (!wallet) {
                    return res.status(404).json({ success: false, message: 'Wallet not found' });
                }
    
                if (wallet.balance < totalAmount) {
                    console.log("wallet balance =========",wallet.balance ,totalAmount)
                    return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
                }
    
                // Deduct the total amount from the wallet balance
                wallet.balance -= totalAmount;
    
                // Record the transaction
                wallet.transactions.push({
                    transaction_id: `txn_${new Date().getTime()}`, // Generate a unique transaction ID
                    amount: totalAmount,
                    type: "debit",
                    description: `Payment for order`,
                    createdAt: new Date(),
                });
    
                await wallet.save();
            }
    
            // Create order items with correct pricing
            const orderItems = cart.products.map(item => {
                const product = item.productId;
                const originalPrice = Number(product.price) || 0;
                const discountPrice = Number(product.discountprice) || 0;
                const categoryDiscountPrice = Number(product.categoryDiscountprice) || 0;
    
                let bestPrice = originalPrice;
                if (discountPrice > 0 && (categoryDiscountPrice === 0 || discountPrice < categoryDiscountPrice)) {
                    bestPrice = discountPrice;
                } else if (categoryDiscountPrice > 0 && (discountPrice === 0 || categoryDiscountPrice < discountPrice)) {
                    bestPrice = categoryDiscountPrice;
                }
    
                return {
                    productId: product._id,
                    productName: product.productName,
                    price: originalPrice,
                    discountedPrice: bestPrice,
                    quantity: item.quantity,
                    status: 'Ordered'
                };
            });
    
            // Handle Razorpay payment
            if (paymentMethod === "RazorePay") {
                const rzp = new Razorpay({
                    key_id: process.env.KeyId,
                    key_secret: process.env.SecretKey
                });
    
                const razorpayOrder = await rzp.orders.create({
                    amount: Math.round(totalAmount * 100), // Convert to paise and ensure it's rounded
                    currency: "INR",
                    receipt: `order_rcptid_${new Date().getTime()}`,
                    payment_capture: 1
                });
    
                req.session.tempOrder = {
                    paymentMethod: 'RazorePay',
                    orderId: razorpayOrder.id,
                    amount: razorpayOrder.amount,
                    currency: razorpayOrder.currency,
                    orderDetails: razorpayOrder,
                    items: orderItems,
                    address: address,
                    totalAmount: totalAmount
                };
    
                return res.json({
                    success: true,
                    message: 'Razorpay order created successfully',
                    keyId: process.env.KeyId,
                    paymentMethod: 'RazorePay',
                    orderId: razorpayOrder.id,
                    amount: razorpayOrder.amount,
                    currency: razorpayOrder.currency,
                    orderDetails: razorpayOrder
                });
            }

            console.log('ibde enthandooooooooooooooooooooooo999999999999999');
            
    
            // Create regular order
            const order = new Order({
                userId,
                items: orderItems,
                address,
                paymentMethod,
                totalAmount,
                status: 'Pending'
            });
            await order.save();
            console.log('ibde enthandooooooooooooooooooooooo99999999');
            // Update product stock
            for (const item of cart.products) {
                const product = await Product.findById(item.productId._id);
                if (!product) continue;
                product.stockQuantity = Math.max(product.stockQuantity - item.quantity, 0);
                await product.save();
            }
    
            // Clear cart
            await Cart.findOneAndUpdate(
                { userId },
                { $set: { products: [] } },
                { new: true }
            );
    
            if (appliedCouponCode) {
                console.log("=========Coupon pushed=========");
                await User.findByIdAndUpdate(
                    userId,
                    { $push: { appliedCoupons: appliedCouponCode } }, 
                    { new: true }
                );
            }
    
            if (req.session.coupon) {
                delete req.session.coupon;
            }
    
            return res.json({
                success: true,
                message: 'Order placed successfully',
                orderId: order._id,
                orderDetails: order
            });
    
        } catch (error) {
            console.error('Order placement error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to process order'
            });
        }
    },
    handlePaymentSucccess: async (req, res) => {
        try {
            const { orderId, paymentId, signature } = req.body;
            const userId = req.session.user?._id;
            const orderDetails = req.session.tempOrder;
    
            if (!orderDetails || orderDetails.orderId !== orderId) {
                return res.status(400).json({ success: false, message: 'Invalid order details' });
            }
    
            // Verify payment signature
            const expectedSignature = crypto.createHmac('sha256', process.env.SecretKey)
                .update(orderId + "|" + paymentId)
                .digest('hex');
    
            if (expectedSignature !== signature) {
                return res.status(400).json({ success: false, message: 'Payment verification failed' });
            }
    
            // Create a new order in database
       const order = new Order({ userId, items: orderDetails.items , address : orderDetails.address, paymentMethod : orderDetails.paymentMethod, totalAmount : orderDetails.totalAmount, status: 'Pending' });
            await order.save();
    
            // Update stock quantity
            for (const item of orderDetails.items) {
                const product = await Product.findById(item.productId);
                if (product) {
                    product.stockQuantity = Math.max(product.stockQuantity - item.quantity, 0);
                    await product.save();
                }
            }
    
            // Clear cart after successful order
            await Cart.findOneAndUpdate({ userId }, { $set: { products: [] } }, { new: true });
    
            // Clear session temp order
            req.session.tempOrder = null;
    
            res.json({ success: true, message: 'Payment successful and order placed', orderId: order._id, orderDetails: order });
        } catch (error) {
            console.error('Payment success handling error:', error);
            res.status(500).json({ success: false, message: 'Failed to process payment success' });
        }
    },      

    getOrderDetailsPage: async (req, res) => {
        try {
            const orderId = req.params.orderId;
            const userId = req.session.user?._id;
    
            if (!userId) {
                return res.redirect('/login');
            }
    
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).render('error', { message: 'User not found' });
            }
    
            const order = await Order.findById(orderId)
                .populate({
                    path: 'items.productId',
                    select: 'productName image price discountprice specification'
                });
    
            if (!order) {
                return res.status(404).render('error', { message: 'Order not found' });
            }
    
            const totalSavings = order.items.reduce((sum, item) => {
                return sum + ((item.price - item.discountedPrice) * item.quantity);
            }, 0);
    
            // Format order date
            const orderDate = order.createdAt.toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
    
            // Payment method translations
            const paymentMethods = {
                'COD': 'Cash on Delivery',
                'ONLINE': 'Online Payment',
                'WALLET': 'Wallet Payment'
            };
    
            res.render('user/orderDetails', {
                user,
                order: order.toObject(),
                orderDate,
                totalSavings,
                paymentMethod: paymentMethods[order.paymentMethod] || order.paymentMethod
            });
    
        } catch (error) {
            console.error('Error fetching order details:', error);
            res.status(500).render('error', {
                message: error.message || 'Failed to load order details'
            });
        }
    },

    cancelProduct: async (req, res) => {
        try {
            const { orderId, itemId } = req.params;
            const userId = req.session.user?._id;
    
            if (!userId) {
                return res.redirect('/login');
            }
    
            const order = await Order.findOne({
                _id: orderId,
                userId: userId
            });
    
            if (!order) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Order not found' 
                });
            }
    
            const item = order.items.id(itemId);
            if (!item) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Item not found in order' 
                });
            }
    
            if (!['Ordered', 'Pending'].includes(item.status)) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Item cannot be cancelled' 
                });
            }
    
            item.status = 'Cancelled';
            
            const product = await Product.findById(item.productId);
            if (product) {
                product.stockQuantity += item.quantity;
                await product.save();
            }
    
            await order.save();
    
            const allCancelled = order.items.every(i => i.status === 'Cancelled');
            if (allCancelled) {
                order.status = 'Cancelled';
                await order.save();
            }
    
            res.json({ 
                success: true, 
                message: 'Product cancelled successfully' + 
                        (allCancelled ? ' and order marked as cancelled' : '') 
            });
    
        } catch (error) {
            console.error('Cancellation error:', error);
            res.status(500).json({ 
                success: false, 
                message: error.message || 'Failed to cancel product' 
            });
        }
    },
    returnProduct:async (req, res) => {
        try {
            const { orderId, productId, returnReason } = req.body;
            const userId = req.session.user._id;
    
            const returnRequest = new ReturnRequest({
                userId,
                orderId,
                productId,
                returnReason
            });
    
            await returnRequest.save();
    
            res.json({ success: true });
        } catch (error) {
            console.error('Error submitting return request:', error);
            res.status(500).json({ success: false, message: 'Failed to submit return request' });
        }
    },
    generateInvoice: async (req, res) => {
        try {
            const userId = req.session.user?._id;
            const orderId = req.params.id;
    
            // Fetch the order and populate the userId field
            const order = await Order.findById(orderId).populate('userId');
    
            if (!order) {
                return res.status(404).json({ message: 'Order not found' });
            }
    
            // Fetch the user details
            const user = await User.findById(order.userId);
    
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
    
            // Create a PDF document
            const doc = new PDFDocument({ margin: 50 });
    
            // Set response headers
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=invoice_${orderId}.pdf`);
    
            // Pipe the PDF to the response object
            doc.pipe(res);
    
            // Document constants
            const pageWidth = doc.page.width;
            const contentWidth = pageWidth - 100; // Account for margins
    
            // Header section with logo and invoice title
            doc.fontSize(22).font('Helvetica-Bold').text('TIME ZONE', 50, 50);
            doc.fontSize(10).font('Helvetica').text('www.timezone.com', 50, 75);
            
            // Right-aligned invoice details box
            const boxTop = 50;
            const boxRight = pageWidth - 50;
            const boxWidth = 200;
            const boxLeft = boxRight - boxWidth;
            
            // Invoice Box
            doc.rect(boxLeft, boxTop, boxWidth, 75)
               .fillAndStroke('#f7f7f7', '#e6e6e6');
            
            // Invoice title and details
            doc.fontSize(16).font('Helvetica-Bold').fillColor('#000')
               .text('INVOICE', boxLeft + 10, boxTop + 10);
            
            const orderIdShort = orderId.slice(-8);
            doc.fontSize(10).font('Helvetica')
               .text(`Invoice #: ${orderIdShort}`, boxLeft + 10, boxTop + 35);
            doc.text(`Date: ${order.createdAt.toLocaleDateString()}`, boxLeft + 10, boxTop + 50);
    
            // Horizontal line separator
            doc.moveDown(4);
            doc.moveTo(50, doc.y).lineTo(pageWidth - 50, doc.y).stroke('#e6e6e6');
            doc.moveDown();
    
            // Billing and Shipping details in two columns
            const colWidth = contentWidth / 2;
            const leftColX = 50;
            const rightColX = leftColX + colWidth + 20;
            const addressY = doc.y;
    
            // Customer details - Left column (fixing font consistency)
            doc.fontSize(12).font('Helvetica-Bold').text('Shipping Address:', leftColX, addressY);
            doc.fontSize(10).font('Helvetica')
               .text(`${user.name}`, leftColX, addressY + 20);
            
            // Ensure address uses consistent font with order ID
            const addressLines = order.address.split('\n').filter(line => line.trim());
            doc.fontSize(10).font('Helvetica')
               .text(addressLines.join(', '), 
                     leftColX, addressY + 35, 
                     { width: colWidth - 20 });
    
            // Order details - Right column
            doc.fontSize(12).font('Helvetica-Bold').text('Order Details:', rightColX, addressY);
            doc.fontSize(10).font('Helvetica')
               .text(`Order ID: ${orderIdShort}`, rightColX, addressY + 20)
               .text(`Payment Method: ${order.paymentMethod}`, rightColX, addressY + 35);
    
            // Move down after address blocks
            doc.y = Math.max(doc.y, addressY + 90);
            
            // Horizontal line before items table
            doc.moveTo(50, doc.y).lineTo(pageWidth - 50, doc.y).stroke('#e6e6e6');
            doc.moveDown();
    
            // Items Table with adjusted column widths
            const tableTop = doc.y + 10;
            
            // Column positions with wider status column
            const itemX = 50;
            const quantityX = itemX + 220;  // Slightly wider item description
            const priceX = quantityX + 60;  // Slightly narrower quantity
            const discountX = priceX + 70;
            const finalPriceX = discountX + 80;
            const statusX = finalPriceX + 80;
    
            // Table Headers - with background
            doc.rect(50, tableTop - 5, pageWidth - 100, 25).fill('#f7f7f7');
            
            doc.fillColor('#000').fontSize(10).font('Helvetica-Bold')
               .text('Item Description', itemX + 5, tableTop)
               .text('Qty', quantityX, tableTop)
               .text('Price', priceX, tableTop)
               .text('Discount', discountX, tableTop)     // Keeping original label "Discount"
               .text('Amount', finalPriceX, tableTop)     // Keeping original label "Amount"
              
            let rowY = tableTop + 30;
    
            // Table Content with alternating row colors and rupee symbol
            order.items.forEach((item, index) => {
                const rowHeight = 25;
                const isEvenRow = index % 2 === 0;
                
                if (isEvenRow) {
                    doc.rect(50, rowY - 5, pageWidth - 100, rowHeight).fill('#f9f9f9');
                }
                
                const finalPrice = item.price - item.discountedPrice;
                
                doc.fillColor('#000').fontSize(9).font('Helvetica')
                   .text(`${item.productName}`, itemX + 5, rowY)
                   .text(`${item.quantity}`, quantityX, rowY)
                   .text(`₹${item.price.toFixed(2)}`, priceX, rowY)
                   .text(`₹${finalPrice.toFixed(2)}`, discountX, rowY)          // "Discount" column showing finalPrice value
                   .text(`₹${item.discountedPrice.toFixed(2)}`, finalPriceX, rowY)  // "Amount" column showing discountedPrice value
                  
                rowY += rowHeight;
            });
    
            // Total section with background
            const totalSectionY = rowY + 20;
            doc.rect(pageWidth - 250, totalSectionY, 200, 30).fill('#f7f7f7');
            
            doc.fillColor('#000').fontSize(12).font('Helvetica-Bold')
               .text('Total Amount:', pageWidth - 245, totalSectionY + 10)
               .text(`₹${order.totalAmount.toFixed(2)}`, pageWidth - 100, totalSectionY + 10);
    
            // Footer section
            const footerY = doc.page.height - 100;
            
            // Horizontal line above footer
            doc.moveTo(50, footerY).lineTo(pageWidth - 50, footerY).stroke('#e6e6e6');
            
            // Footer text
            doc.fontSize(10).font('Helvetica')
               .text('Thank you for shopping with TIME ZONE!', 50, footerY + 15)
               .fontSize(8)
               .text('For questions about your order, please contact customer support at support@timezone.com', 
                     50, footerY + 35);
            
            // Terms and conditions
            doc.fontSize(7).fillColor('#777')
               .text('This is a computer-generated invoice and does not require a signature.', 
                     50, footerY + 60, { align: 'center' });
    
            // Finalize the PDF
            doc.end();
    
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error generating invoice', error: error.message });
        }
    },
};
