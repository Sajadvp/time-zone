const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Wishlist = require("../../models/wishlistSchma");

module.exports = {
  getWishListPage: async (req, res) => {
    try {
      const userId = req.session.user?._id; // Assuming you have user authentication and req.user contains the logged-in user's data
      console.log("userrrrrrrrrrrrr", userId);

      // Fetch the wishlist for the user
      const wishlist = await Wishlist.findOne({ userId: userId }).populate(
        "products.productId"
      );

      // Check if wishlist is null or empty
      if (!wishlist || !wishlist.products || wishlist.products.length === 0) {
        // If the wishlist is empty, render the page with an empty wishlist
        return res.render("user/wishlist", { wishlist: [] });
      }

      // If there are products in the wishlist, pass them to the frontend
      res.render("user/wishlist", { wishlist: wishlist.products });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },

  toggleWishlist: async (req, res) => {
    try {
      if (!req.session.user) {
        return res.status(401).json({
          success: false,
          message: "Please log in to add to wishlist",
        });
      }
  
      const userId = req.session.user._id;
      const productId = req.body.productId;
  
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ success: false, message: "Product not found" });
      }
  
      let wishlist = await Wishlist.findOne({ userId });
  
      if (wishlist) {
        const productIndex = wishlist.products.findIndex((i) => i.productId.equals(productId));
  
        if (productIndex !== -1) {
          wishlist.products.splice(productIndex, 1);
          await wishlist.save();
          return res.status(200).json({
            success: true,
            message: "Product removed from wishlist",
            wishlistCount: wishlist.products.length, // Return updated count
          });
        } else {
          wishlist.products.push({ productId });
          await wishlist.save();
          return res.status(200).json({
            success: true,
            message: "Product added to wishlist",
            wishlistCount: wishlist.products.length, // Return updated count
          });
        }
      } else {
        const newWishlist = new Wishlist({
          userId,
          products: [{ productId }],
        });
        await newWishlist.save();
        return res.status(200).json({
          success: true,
          message: "Wishlist created and product added",
          wishlistCount: 1, // New wishlist has 1 item
        });
      }
    } catch (error) {
      console.error("Error in toggleWishlist:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  },
  wishlistToggle: async (req, res) => {
    console.log("hiiiiiiiiiiiii");
    try {
      const { productId } = req.body;
      const userId = req.user._id; // Assuming user is authenticated

      let wishlist = await Wishlist.findOne({ userId });

      if (!wishlist) {
        wishlist = new Wishlist({ userId, products: [] });
      }

      const productIndex = wishlist.products.findIndex(
        (p) => p.productId.toString() === productId
      );

      if (productIndex > -1) {
        // Product exists, remove it
        wishlist.products.splice(productIndex, 1);
        await wishlist.save();
        return res.json({
          success: true,
          message: "Item removed from wishlist",
          action: "removed",
        });
      } else {
        // Add product to wishlist
        wishlist.products.push({ productId });
        await wishlist.save();
        return res.json({
          success: true,
          message: "Product added to wishlist",
          action: "added",
        });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },

  removeFromWishlist: async (req, res) => {
    const { productId } = req.body;
    const userId = req.session.user?._id;

    try {
      const wishlist = await Wishlist.findOne({ userId });

      if (wishlist) {
        wishlist.products = wishlist.products.filter(
          (p) => !p.productId.equals(productId)
        );
        await wishlist.save();
        res
          .status(200)
          .json({ success: true, message: "Product removed from wishlist" });
      } else {
        res.status(404).json({ success: false, message: "Wishlist not found" });
      }
    } catch (error) {
      res.status(500).json({ success: false, message: "Server error", error });
    }
  },
  addToWishlist: async (req, res) => {
    const { productId } = req.body;
    const userId = req.session.user?._id;
  
    if (!userId) {
      return res.status(401).json({ success: false, message: "Please log in to add to wishlist" });
    }
  
    try {
      let wishlist = await Wishlist.findOne({ userId });
  
      if (!wishlist) {
        wishlist = new Wishlist({ userId, products: [{ productId }] });
        await wishlist.save();
        return res.status(200).json({
          success: true,
          message: "Product added to wishlist",
          wishlistCount: 1 // New wishlist has 1 item
        });
      }
  
      const productIndex = wishlist.products.findIndex((p) => p.productId.equals(productId));
  
      if (productIndex === -1) {
        wishlist.products.push({ productId });
        await wishlist.save();
        return res.status(200).json({
          success: true,
          message: "Product added to wishlist",
          wishlistCount: wishlist.products.length // Return updated count
        });
      } else {
        return res.status(400).json({
          success: false,
          message: "Product already in wishlist",
          wishlistCount: wishlist.products.length // Return current count
        });
      }
    } catch (error) {
      console.error("Error in addToWishlist:", error);
      return res.status(500).json({ success: false, message: "Server error", error });
    }
  },
  profileWishlist: async (req, res) => {
    const { productId } = req.body;
    const userId = req.session.user?._id; // Assuming you have user authentication

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User not logged in" });
    }

    try {
      // Check if the product exists
      const product = await Product.findById(productId);
      if (!product) {
        return res
          .status(404)
          .json({ success: false, message: "Product not found" });
      }

      // Find or create the user's wishlist
      let wishlist = await Wishlist.findOne({ userId });

      if (!wishlist) {
        // If the wishlist doesn't exist, create a new one
        wishlist = new Wishlist({
          userId,
          products: [{ productId }],
        });
      } else {
        // Check if the product is already in the wishlist
        const productIndex = wishlist.products.findIndex((p) =>
          p.productId.equals(productId)
        );

        if (productIndex === -1) {
          // If the product is not in the wishlist, add it
          wishlist.products.push({ productId });
        } else {
          // If the product is already in the wishlist, return a message
          return res
            .status(400)
            .json({ success: false, message: "Product already in wishlist" });
        }
      }

      // Save the wishlist
      await wishlist.save();

      // Return success response
      res.json({ success: true, message: "Product added to wishlist" });
    } catch (error) {
      console.error("Error adding to wishlist:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  },
};
