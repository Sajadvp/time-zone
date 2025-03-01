const User = require("../../models/userSchema");
const Coupon = require("../../models/couponSchema");

module.exports = {
    // Get all coupons
    getCouponPage: async (req, res) => {
        try {
            const StoreCoupon = await Coupon.find().lean(); // Using lean() for better performance
            return res.render('admin/coupon', { StoreCoupon });
        } catch (error) {
            console.error('Error in getCouponPage:', error);
            return res.status(500).json({ 
                success: false, 
                message: "Internal Server Error",
                error: error.message 
            });
        }
    },

    // Add new coupon
    AddCoupon: async (req, res) => {
        try {
            const { couponCode, minPurchaseAmount, discountAmount, date, expiryDate } = req.body;

            // Input validation
            if (!couponCode?.trim() || !minPurchaseAmount || !discountAmount || !date || !expiryDate) {
                return res.status(400).json({ 
                    success: false, 
                    message: "All fields are required" 
                });
            }

            // Additional validation
            const minPurchase = parseFloat(minPurchaseAmount);
            const discount = parseFloat(discountAmount);
            
            if (isNaN(minPurchase) || minPurchase < 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Minimum purchase amount must be a non-negative number" 
                });
            }

            if (isNaN(discount) || discount <= 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Discount amount must be a positive number" 
                });
            }

            if (minPurchase <= discount) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Minimum purchase amount must be greater than discount amount" 
                });
            }

            if (new Date(expiryDate) < new Date(date)) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Expiry date must be after start date" 
                });
            }

            // Check for existing coupon
            const trimmedCouponCode = couponCode.trim();
            const existCoupon = await Coupon.findOne({ couponCode: trimmedCouponCode });
            if (existCoupon) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Coupon code already exists" 
                });
            }

            // Create new coupon
            const newCoupon = await Coupon.create({
                couponCode: trimmedCouponCode,
                minPurchaseAmount: minPurchase,
                discountAmount: discount,
                date: new Date(date),
                expiryDate: new Date(expiryDate)
            });

            return res.status(201).json({ 
                success: true, 
                message: "Coupon created successfully",
                coupon: newCoupon 
            });

        } catch (error) {
            console.error('Error in AddCoupon:', error);
            return res.status(500).json({ 
                success: false, 
                message: "Internal Server Error",
                error: error.message 
            });
        }
    },

    // Delete coupon
    DeleteCoupon: async (req, res) => {
        try {
            const { id } = req.params;

            if (!id) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Coupon ID is required" 
                });
            }

            const deletedCoupon = await Coupon.findByIdAndDelete(id);

            if (!deletedCoupon) {
                return res.status(404).json({ 
                    success: false, 
                    message: "Coupon not found" 
                });
            }

            return res.json({ 
                success: true, 
                message: "Coupon successfully deleted" 
            });

        } catch (error) {
            console.error('Error in DeleteCoupon:', error);
            return res.status(500).json({ 
                success: false, 
                message: "Internal Server Error",
                error: error.message 
            });
        }
    },

    // Edit existing coupon
    EDITCOUPON: async (req, res) => {
        try {
            const { couponId, couponCode, minPurchaseAmount, discountAmount, date, expiryDate } = req.body;

            // Input validation
            if (!couponId || !couponCode?.trim() || !minPurchaseAmount || !discountAmount || !date || !expiryDate) {
                return res.status(400).json({ 
                    success: false, 
                    message: "All fields are required" 
                });
            }

            // Additional validation
            const minPurchase = parseFloat(minPurchaseAmount);
            const discount = parseFloat(discountAmount);
            
            if (isNaN(minPurchase) || minPurchase < 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Minimum purchase amount must be a non-negative number" 
                });
            }

            if (isNaN(discount) || discount <= 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Discount amount must be a positive number" 
                });
            }

            if (minPurchase <= discount) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Minimum purchase amount must be greater than discount amount" 
                });
            }

            if (new Date(expiryDate) < new Date(date)) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Expiry date must be after start date" 
                });
            }

            // Find and update coupon
            const updatedCoupon = await Coupon.findByIdAndUpdate(
                couponId,
                {
                    couponCode: couponCode.trim(),
                    minPurchaseAmount: minPurchase,
                    discountAmount: discount,
                    date: new Date(date),
                    expiryDate: new Date(expiryDate)
                },
                { new: true, runValidators: true }
            );

            if (!updatedCoupon) {
                return res.status(404).json({ 
                    success: false, 
                    message: "Coupon not found" 
                });
            }

            return res.json({ 
                success: true, 
                message: "Coupon successfully updated",
                coupon: updatedCoupon 
            });

        } catch (error) {
            console.error('Error in EDITCOUPON:', error);
            return res.status(500).json({ 
                success: false, 
                message: "Internal Server Error",
                error: error.message 
            });
        }
    }
};