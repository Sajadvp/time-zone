const Category = require("../../models/categorySchema");
const CategoryOffer = require("../../models/categoryOfferSchema");
const Product = require("../../models/productSchema");

module.exports = {
  getOfferPage: async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; // Get the page number from the query parameter
        const limit = 5; // Number of offers per page
        const skip = (page - 1) * limit; // Calculate the number of documents to skip

        // Fetch categories
        const categories = await Category.find();

        // Fetch category offers with pagination and populate the category name
        const categoryOffer = await CategoryOffer.find({})
            .populate('categoryId')
            .skip(skip)
            .limit(limit);

        // Count total number of category offers for pagination
        const totalOffers = await CategoryOffer.countDocuments();
        const totalPages = Math.ceil(totalOffers / limit);

        // Pass data to the frontend
        res.render("admin/offers", {
            categories,
            categoryOffer,
            currentPage: page,
            totalPages,
        });
    } catch (error) {
        console.error("Error fetching categories:", error);
        res.status(500).send("Internal Server Error");
    }
},
  getAddCategoryOffer: async (req, res) => {
    try {
      const categoryOffer=await CategoryOffer.find({})
      console.log("categoryOffer===",categoryOffer)
      res.render("admin/addCategoryOffer");
    } catch (error) {
      console.error("Error rendering addCategoryOffer page:", error);
      res.status(500).send("Internal Server Error");
    }
  },
  postAddCategoryOffer: async (req, res) => {
    try {
      const { categoryId, discountPercentage, endDate } = req.body;
  
      // Validation: Check if category is selected
      if (!categoryId) {
        return res.json({ success: false, message: "Please select a category." });
      }
  
      // Validation: Check if discount percentage is between 0 and 100
      if (discountPercentage <= 0 || discountPercentage >= 100) {
        return res.json({ success: false, message: "Discount percentage must be greater than 0 and less than 100." });
      }
  
      // Validation: Check if end date is current date or greater
      const currentDate = new Date();
      const selectedDate = new Date(endDate);
      if (selectedDate < currentDate) {
        return res.json({ success: false, message: "Expiry date must be today or a future date." });
      }
  
      // Check if the category offer already exists
      const isExist = await CategoryOffer.findOne({ categoryId });
      if (isExist) {
        return res.json({ success: false, message: "Category offer already applied." });
      }
  
      // Create a new category offer
      const newOffer = new CategoryOffer({
        categoryId,
        discountPercentage,
        expiryDate: endDate,
      });
      await newOffer.save();
  
      // Fetch all products in the given category
      const products = await Product.find({ category: categoryId });
  
      // Update products with the category discount if applicable
      for (let product of products) {
        const categoryDiscountAmount = Math.round((product.price * discountPercentage) / 100);
        const oldDiscountPercentage = Math.round((product.price - product.discountprice) / product.price * 100);
  
        if (discountPercentage > oldDiscountPercentage || !product.discountprice) {
          await Product.findByIdAndUpdate(product._id, {
            $set: {
              categoryDiscountprice: product.price - categoryDiscountAmount,
              categoryOfferId: newOffer._id,
            },
          });
        }
      }
  
      res.json({ success: true, message: "Category offer applied successfully." });
    } catch (error) {
      console.log(error);
      res.json({ success: false, message: error.message });
    }
  },

  deleteCategoryOffer:async (req, res) => {
    try {
      const offerId  = req.params.id

      const offer =await CategoryOffer.findById(offerId)
      
      const products=await Product.find({category:offer.categoryId})

      for (let product of products) {
          await Product.findByIdAndUpdate(product._id, {
            $set: {
              categoryDiscountprice: 0,
              categoryOfferId: null,
            },
          });
      }
console.log("=========================================");

     await CategoryOffer.findByIdAndDelete(offerId)
       
      res.redirect('/admin/offers'); 
    } catch (error) {
      console.error('Error deleting category offer:', error);
      res.status(500).send('Internal Server Error');
    }
  },
  getEditCategoryOffer: async (req, res) => {
    try {
        const offer = await CategoryOffer.findById(req.params.id).populate('categoryId');
        if (!offer) {
            return res.status(404).json({ success: false, message: 'Offer not found' });
        }
        res.status(200).json({ success: true, offer });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
},
postEditCategoryOffer:async (req, res) => {
  try {
      const { offerId, categoryId, discountPercentage, endDate } = req.body;

      // Validate input
      if (!categoryId || !discountPercentage || !endDate) {
          return res.status(400).json({ success: false, message: 'All fields are required' });
      }
      if (discountPercentage <= 0 || discountPercentage >= 100) {
          return res.status(400).json({ success: false, message: 'Discount percentage must be between 1 and 99' });
      }
      if (new Date(endDate) < new Date()) {
          return res.status(400).json({ success: false, message: 'Expiry date must be today or a future date' });
      }

      // Update the offer
      const updatedOffer = await CategoryOffer.findByIdAndUpdate(
          offerId,
          { categoryId, discountPercentage, expiryDate: endDate },
          { new: true }
      ).populate('categoryId');

      if (!updatedOffer) {
          return res.status(404).json({ success: false, message: 'Offer not found' });
      }

      res.status(200).json({ success: true, message: 'Offer updated successfully', offer: updatedOffer });
  } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
  }
}

};
