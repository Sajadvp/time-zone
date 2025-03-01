const express = require("express");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const CategoryOffer = require("../../models/categoryOfferSchema");
const Brand = require("../../models/brandSchema"); // Assuming you have a Brand model
const mongoose = require("mongoose");
const fs = require("fs")

module.exports = {
  loadproductPage: async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; // Current page number, default to 1
        const limit = 10; // Items per page
        const skip = (page - 1) * limit; // Calculate items to skip

        const totalProducts = await Product.countDocuments(); // Total number of products
        const totalPages = Math.ceil(totalProducts / limit); // Calculate total pages

        // Fetch products with pagination
        const products = await Product.find()
            .populate("category") // Populate category details
            .populate("brand") // Populate brand details
            .skip(skip)
            .limit(limit);

        // Render the product page with required data
        res.render("admin/product", {
            products,
            totalPages,
            currentPage: page,
        });
    } catch (error) {
        console.error("Error in loadproductPage:", error.message);
        res.render("error/500");
    }
},

  loadAddProductPage: async (req, res) => {
    try {
      const categories = await Category.find({ isListed: true });
      console.log(categories, "====category====");
      const brand = await Brand.find({ isActive: true });
      console.log(brand, "======brand=========");

      const error = req.session?.productExists ? "product already exist" : null;

      res.render("admin/addProduct", { categories, brand, error }); // Variable names must match
    } catch (error) {
      console.error(error.message);
    }
  },

  addProduct: async (req, res) => {
    const {
      productName,
      description,
      stockQuantity,
      discountprice,
      expiryDate,
      category,
      brand,
      price,
      specification,
    } = req.body;

    const catOffer = await Category.findById(category);

    console.log("i think its not getting properly right", discountprice);

    req.session.Admin = true;
    try {
      req.session.Admin = true;

      // Check if product name already exists
      const existingProduct = await Product.findOne({
        productName: productName.trim(),
      });

      if (existingProduct) {
        req.session.productExists = true; // Set flag to indicate the product name already exists
        console.log("redirecting");

        return res.redirect("/admin/addProducts"); // Redirect back to add product page
      }

      const filepaths = req.files.map((file) => {
        return `/uploads/${file.filename}`;
      });

      console.log("check eda check", filepaths);

      req.session.Admin = true;

      const categoryOffer = discountprice > 0 ? 0 : catOffer.discountprice;

      const newProduct = new Product({
        productName,
        image: filepaths,
        description,
        stockQuantity,
        category: catOffer._id,
        categoryOffer: categoryOffer,
        brand,
        discountprice: discountprice ? parseFloat(discountprice) : 0,
        offerDate: expiryDate ? new Date(expiryDate) : null,
        price,
        specification,
      });

      console.log(
        "..........................................bgggggggggggggggggg.................................."
      );

      await newProduct.save();
      console.log("successfully ...............added", newProduct);

      req.session.sussAdd = "Product successfully added.";
      req.session.Admin = true;
      res.redirect("/admin/product");
    } catch (error) {
      console.log("Controller ERROR", error);
    }
  },

  loadEditProductPage: async (req, res) => {
    try {
      const productId = req.params.id;
      const product = await Product.findById(productId).lean();
      const categories = await Category.find({ isListed: true }).lean();
      const brands = await Brand.find({ isActive: true }).lean();
      const error = req.session?.editError ? req.session?.editError : null;
      res.render("admin/editProduct", {
        product,
        categories,
        brand: brands,
        error,
      });
    } catch (error) {
      console.error("Error loading product:", error);
      res.status(500).send("Server error");
    }
  },

  updateProduct : async (req, res) => {
    try {
      const { id } = req.params;
      const {
        name,
        description,
        category,
        brand,
        price,
        stockQuantity,
        discountPrice,
        specification,
        existingImages,
        removedImages,
      } = req.body;
      console.log("if", id);
      console.log(name);
  
      // Clean up the name to remove any extra spaces and ensure it matches the field name in MongoDB
      const cleanedName = name.trim();
  
      // Use `new` to correctly instantiate the ObjectId
      const objectId = new mongoose.Types.ObjectId(id);
      console.log(objectId);
  
      // Find products with the same name, excluding the current product
      const isProduct = await Product.findOne({
        productName: { $regex: new RegExp("^" + cleanedName + "$", "i") }, // Case-insensitive check and field name correction
        _id: { $ne: objectId }, // Exclude the current product
      });
  
      console.log("Duplicate product check result:", isProduct);
  
      if (isProduct) {
        req.session.editError = "Name already exists!";
        res.redirect(`/admin/editProduct/${id}`);
        return;
      }
  
      // Handle images
      let finalImages = [];
  
      // Process existing images
      if (existingImages) {
        const existingImagesArray = Array.isArray(existingImages)
          ? existingImages
          : [existingImages];
        const removedImagesArray = Array.isArray(removedImages) ? removedImages : [];
  
        finalImages = existingImagesArray.filter(
          (img) => !removedImagesArray.includes(img)
        );
      }
  
      // Add new uploaded images
      if (req.files && req.files.length > 0) {
        const newImages = req.files.map((file) => `/uploads/${file.filename}`);
        finalImages = [...finalImages, ...newImages];
      }
  
      // Update the product in the database
      const updatedProduct = await Product.findByIdAndUpdate(
        id,
        {
          productName: name,
          description,
          category,
          brand,
          price,
          stockQuantity,
          discountPrice: discountPrice || 0,
          specification,
          image: finalImages,
        },
        { new: true }
      );
  
      if (!updatedProduct) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }
  
      // Return the updated product details
      res.json({
        success: true,
        product: updatedProduct,
      });
    } catch (error) {
      console.error("Update product error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },
  // Handle Product Update
  editProduct: async (req, res) => {
    try {
      const { id } = req.params;
      const updatedData = req.body;

      // Handle image uploads
      if (req.files && req.files.length > 0) {
        const imagePaths = req.files.map((file) => `/uploads/${file.filename}`);
        updatedData.image = imagePaths;
      }

      // Handle brand and category
      updatedData.brand = updatedData.brand ? updatedData.brand : null;
      updatedData.category = updatedData.category ? updatedData.category : null;

      const updatedProduct = await Product.findByIdAndUpdate(id, updatedData, {
        new: true,
      });

      if (!updatedProduct) {
        return res.status(404).json({ message: "Product not found." });
      }

      res.redirect("/admin/product");
    } catch (error) {
      console.log("Error editing product:", error);
      res
        .status(500)
        .json({ message: "An error occurred while editing the product." });
    }
  },

  // Handle Product Deletion
  deleteProduct: async (req, res) => {
    try {
      const { id } = req.params;
      const deletedProduct = await Product.findByIdAndDelete(id);

      if (!deletedProduct) {
        return res.status(404).json({ message: "Product not found." });
      }

      res.redirect("/admin/product");
    } catch (error) {
      console.log("Error deleting product:", error);
      res
        .status(500)
        .json({ message: "An error occurred while deleting the product." });
    }
  },

  // Toggle Product Status (Listed/Unlisted)
  toggleProductStatus: async (req, res) => {
    try {
      const productId = req.params.id;
      const product = await Product.findById(productId);

      if (!product) {
        return res
          .status(404)
          .json({ success: false, message: "Product not found." });
      }

      product.status = product.status === "Active" ? "Inactive" : "Active";
      await product.save();

      res.json({ success: true, status: product.status });
    } catch (error) {
      console.error("Error toggling product status:", error);
      res.status(500).json({
        success: false,
        message: "An error occurred while toggling the product status.",
      });
    }
  },

  getEditProductPage: async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await Product.findById(productId).lean();

        // Ensure `image` field exists
        if (!product.image) {
            product.image = [];
        }

        const categories = await Category.find({ isListed: true }).lean();
        const brand = await Brand.find({ isActive: true }).lean();

        res.render("admin/editPro", {
            product,
            categories,
            brand,
        });
    } catch (error) {
        console.error("Error loading product:", error);
        res.status(500).send("Server error");
    }
},

// Edit product current function

updateProducts: async (req, res) => {


  try {
    const productId = req.params.id;

    // Gather the updated product data
    const updatedData = {
      productName: req.body.productName,
      description: req.body.description,
      category: req.body.category,
      brand: req.body.brand,
      price: req.body.price,
      stockQuantity: req.body.stockQuantity,
      discountprice: req.body.discountprice,
      specification: req.body.specification,
      status: req.body.status,
    };

 

    // Get the current product
    const currentProduct = await Product.findById(productId);
    if (!currentProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if the updated product name is already used by another product
    const existingProduct = await Product.findOne({
      productName: updatedData.productName,
      _id: { $ne: productId }  // Exclude the current product
    });

    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: 'Product name already exists for another product.'
      });
    }

    // Initialize image array with current images
    let updatedImages = [...currentProduct.image];

    // Handle removed images
    if (req.body.removedImages) {
      const removedImages = JSON.parse(req.body.removedImages);
      updatedImages = updatedImages.filter(img => !removedImages.includes(img));
    }

    // Handle new image uploads
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => `/uploads/${file.filename}`);
      updatedImages = [...updatedImages, ...newImages];
    }

    // Add the updated images to updatedData
    updatedData.image = updatedImages;


    const isCategoryOffer = await CategoryOffer.findOne({categoryId:updatedData.category})
console.log("isCategoryOffer",isCategoryOffer);

if(isCategoryOffer){
  const categoryDiscountAmount =
  Math.round((updatedData.price * isCategoryOffer.discountPercentage) / 100);
  
console.log(categoryDiscountAmount ,"< ", updatedData.discountprice);

  if(categoryDiscountAmount <  updatedData.discountprice || !parseInt(updatedData.discountprice)){
    console.log("=====================");
    
    updatedData.categoryDiscountprice =categoryDiscountAmount;
    updatedData.categoryOfferId = isCategoryOffer._id
  }
}

console.log("updatedData",updatedData);


    // Update the product in the database
    const updatedProduct = await Product.findByIdAndUpdate(
      productId, 
      updatedData, 
      { new: true }
    );

    res.json({
      success: true,
      message: 'Product updated successfully!',
      data: updatedProduct
    });

  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
},


};

