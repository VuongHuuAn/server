const express = require('express');
const productRouter = express.Router();
const auth = require("../middlewares/auth");
const { Product } = require("../models/product");
const ratingSchema = require("../models/rating");

// /api/products?category=TV 
productRouter.get("/api/products", auth, async (req, res) => {
  try {
      const products = await Product.find({ category: req.query.category })
          .populate('sellerId', 'shopName shopAvatar');
      res.json(products);
  } catch (e) {
      res.status(500).json({ error: e.message });
  }
});

// search product
productRouter.get("/api/products/search/:name", auth, async (req, res) => {
  try {
      const products = await Product.find({
          name: { $regex: req.params.name, $options: "i" },
      }).populate('sellerId', 'shopName shopAvatar');
      res.json(products);
  } catch (e) {
      res.status(500).json({ error: e.message });
  }
});

// Rating product and Update avgRating
productRouter.post("/api/rate-product", auth, async (req, res) => {
  try {
      const { id, rating } = req.body;
      let product = await Product.findById(id);

      for (let i = 0; i < product.ratings.length; i++) {
          if (product.ratings[i].userId == req.user) {
              product.ratings.splice(i, 1); // Remove the old rating from the same user
              break;
          }
      }
      // Define a new rating schema for the user
      const ratingSchema = {
          userId: req.user,
          rating,
      };

      // Push the new rating to the product's ratings array
      product.ratings.push(ratingSchema);
      const sum = product.ratings.reduce((a, b) => a + b.rating, 0);
      if (product.ratings.length > 0) {
          product.avgRating = sum / product.ratings.length;
      }

      // Save the updated product to the database
      product = await product.save();
      res.json(product);
  } catch (e) {
      res.status(500).json({ error: e.message });
  }
});



productRouter.get("/api/deal-of-day", auth, async (req, res) => {
  try {
    const now = new Date();
    
    // Tìm các sản phẩm đang trong thời gian giảm giá
    let products = await Product.find({
      'discount.percentage': { $gt: 0 },
      'discount.startDate': { $lte: now },
      'discount.endDate': { $gte: now }
    })
    .populate('sellerId', 'shopName shopAvatar')
    .sort({ 'discount.percentage': -1 }) // Sắp xếp theo phần trăm giảm giá
    .limit(10); // Lấy 10 sản phẩm giảm giá cao nhất

    if (products.length < 10) {
      const remainingCount = 10 - products.length;
    const highRatedProducts = await Product.find({
      _id: { $nin: products.map(p => p._id) }, // Exclude already selected products
    })
    .populate('sellerId', 'shopName shopAvatar')
    .sort({ avgRating: -1 })
    .limit(remainingCount);

    products = [...products, ...highRatedProducts];
    }

    res.json(products);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }

  
});
// Add comment
productRouter.post("/api/add-comment", auth, async (req, res) => {
  try {
   console.log("Starting add-comment process");
   const { productId, content, rating, images = [], purchaseVerified = false } = req.body;
   console.log("Request body:", { productId, content, rating, images, purchaseVerified });
   console.log("User info:", { userId: req.user, userName: req.userName }); // Log để debug
    // Find product
   const product = await Product.findById(productId);
   if (!product) {
     console.log("Product not found:", productId);
     return res.status(404).json({ error: "Không tìm thấy sản phẩm" });
   }
    // Create new comment với userName từ request
   const newComment = {
     userId: req.user,
     userName: req.userName, // Sử dụng userName từ auth middleware
     content,
     images,
     rating,
     purchaseVerified,
     createdAt: new Date(),
     replies: []
   };
    // Thêm comment và xử lý tiếp
   product.comments.push(newComment);
   await product.save();
   res.json(product);
 } catch (e) {
   console.error("Error in add-comment:", e);
   res.status(500).json({ error: e.message });
 }
 });
 // Add reply to comment
 productRouter.post("/api/add-reply", auth, async (req, res) => {
  try {
    console.log("Starting add-reply process");
    const { commentId, content } = req.body;
    console.log("Request body:", { commentId, content });
     // Tìm product chứa comment đó
    const product = await Product.findOne({ "comments._id": commentId });
    if (!product) {
      console.log("Comment not found:", commentId);
      return res.status(404).json({ error: "Comment not found" });
    }
     // Tìm comment
    const comment = product.comments.find(c => c._id.toString() === commentId);
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }
     // Check if user is seller
    const isSellerReply = product.sellerId.toString() === req.user;
     // Add reply
    const reply = {
      userId: req.user,
      userName: req.userName,
      content,
      createdAt: new Date(),
      isSellerReply
    };
     comment.replies.push(reply);
    await product.save();
    console.log("Reply saved successfully");
     // Return only the updated comment
    res.json({
      comment: comment
    });
  } catch (e) {
    console.error("Error in add-reply:", e);
    res.status(500).json({ error: e.message });
  }
 });

 productRouter.get("/api/product/comments/:productId", auth, async (req, res) => {
  try {
    const { productId } = req.params;
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({ error: "Không tìm thấy sản phẩm" });
    }
     // Sắp xếp comments theo thời gian mới nhất
    const sortedComments = product.comments.sort((a, b) => 
      b.createdAt - a.createdAt
    );
     res.json({
      comments: sortedComments,
      totalComments: product.commentCount
    });
   } catch (e) {
    console.error("Error fetching comments:", e);
    res.status(500).json({ error: e.message });
  }
 });


module.exports = productRouter;