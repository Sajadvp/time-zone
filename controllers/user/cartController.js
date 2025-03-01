const Product = require("../../models/productSchema");
const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const CategoryOffer = require("../../models/categorySchema");
const mongoose = require("mongoose");

async function checkStock(productId, quantity) {
  const product = await Product.findById(productId);

  if (!product) {
    return "Product not found";
  }

  if (product.stockQuantity < quantity) {
    return "No Stock";
  } else if (quantity < 1) {
    return "Min 1 qty needed";
  } else {
    return true;
  }
}

module.exports = {
  cartRender: async (req, res) => {
  try {
    const userId = req.session.user?._id;
    if (!userId) {
      return res.redirect("/login");
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.redirect("/login");
    }

    const cartItems = await Cart.findOne({ userId }).populate({
      path: "products.productId",
      model: "Product",
    });

    // Filter out products with null productId
    if (cartItems) {
      cartItems.products = cartItems.products.filter(item => item.productId !== null);
    }

    res.render("user/cart", { user, cartItems });
  } catch (error) {
    console.error("Error fetching user cart:", error);
    res.status(500).send("Server Error");
  }
},



addToCart: async (req, res) => {
  const { productId } = req.body;
  const userId = req.session.user?._id;

  if (!userId) {
    return res.json({ success: false, message: "Please log in to add products to the cart." });
  }

  try {
    const product = await Product.findById(productId);
    if (!product) {
      return res.json({ success: false, message: "Product not found." });
    }

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      if (product.stockQuantity < 1) {
        return res.json({ success: false, message: "Sorry, we don't have any more units for this item." });
      }
      cart = new Cart({ userId, products: [{ productId, quantity: 1 }] });
    } else {
      const productIndex = cart.products.findIndex((p) => p.productId.toString() === productId);

      if (productIndex > -1) {
        if (cart.products[productIndex].quantity + 1 > product.stockQuantity) {
          return res.json({ success: false, message: "Sorry, we don't have any more units for this item." });
        }
        cart.products[productIndex].quantity += 1;
      } else {
        if (product.stockQuantity < 1) {
          return res.json({ success: false, message: "Sorry, we don't have any more units for this item." });
        }
        cart.products.push({ productId, quantity: 1 });
      }
    }

    await cart.save();
    res.json({
      success: true,
      cartCount: cart.products.length, // Return updated cart count
    });
  } catch (err) {
    console.error("Error updating cart:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
},
  updateCart: async (req, res) => {
    const { productId } = req.params;
    const { quantity } = req.body;
    const userId = req.session.user?._id;

    if (!userId) {
      return res.redirect("/login");
    }

    try {
      const cart = await Cart.findOne({ userId });
      if (!cart) {
        return res.status(404).json({ success: false, message: "Cart not found" });
      }

      const item = cart.products.find((item) => item.productId.toString() === productId);
      if (!item) {
        return res.status(404).json({ success: false, message: "Item not found in cart" });
      }

      const result = await checkStock(productId, quantity + item.quantity);
      if (typeof result !== "boolean") {
        return res.status(400).json({ message: result });
      }

      item.quantity += quantity;
      await cart.save();
      res.json({ success: true, message: "Quantity updated" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },

  removeCart: async (req, res) => {
    const { productId } = req.body;
    const userId = req.session.user?._id;

    if (!userId) {
      return res.redirect("/login");
    }

    try {
      const cart = await Cart.findOne({ userId });
      if (!cart) {
        return res.status(404).json({ success: false, message: "Cart not found" });
      }

      cart.products = cart.products.filter((item) => item.productId.toString() !== productId);
      await cart.save();
      res.json({ success: true, message: "Item removed" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },

  clearCart:async (req, res) => {
    try {
      const userId = req.session.user?._id;
  
      if (!userId) {
        console.log("User not authenticated. Redirecting to login.");
        return res.status(401).json({ success: false, message: "User not logged in" });
      }
  
      console.log("Clearing cart for user:", userId);
  
      const result = await Cart.deleteMany({ userId });
  
      console.log("Cart Clear Result:", result);
  
      res.json({ success: true, message: "Cart cleared successfully" });
    } catch (error) {
      console.error("Error clearing cart:", error);
      res.status(500).json({ success: false, message: "Internal Server Error" });
    }
  },
  
};
