const express = require('express');
const { Product } = require('../models/product');
const adminRouter = express.Router();
const admin = require("../middlewares/admin");
const Order = require("../models/order");
const User = require("../models/user");
const SellerRequest = require("../models/sellerRequest");


// Admin gets all pending seller requests
adminRouter.get('/admin/seller-requests', admin, async (req, res) => {
  try {
      const requests = await SellerRequest.find({ status: 'pending' })
          .populate('userId', 'name email') // Lấy thêm name và email từ user
          .lean();
      res.json(requests);
  } catch (e) {
      res.status(500).json({ error: e.message });
  }
});

// Admin approves or rejects seller request
adminRouter.post('/admin/process-seller-request', admin, async (req, res) => {
  try {
      const { requestId, status } = req.body;
      const request = await SellerRequest.findById(requestId);
      
      if (!request) {
          return res.status(404).json({ msg: "Request not found" });
      }

      request.status = status;
      await request.save();

      if (status === 'approved') {
          await User.findByIdAndUpdate(request.userId, {
              type: 'seller',
              shopName: request.shopName,
              shopDescription: request.shopDescription,
              address: request.address,
              shopAvatar: request.avatarUrl,
          });
      }

      res.json({ msg: `Seller request ${status}` });
  } catch (e) {
      res.status(500).json({ error: e.message });
  }
});

// Get all sellers
adminRouter.get("/admin/sellers", admin, async (req, res) => {
  try {
      const sellers = await User.find({ type: "seller" });
      res.json(sellers);
  } catch (e) {
      res.status(500).json({ error: e.message });
  }
});

// Disable seller account
adminRouter.post("/admin/disable-seller", admin, async (req, res) => {
  try {
      const { sellerId } = req.body;
      const seller = await User.findById(sellerId);
      
      if (!seller || seller.type !== "seller") {
          return res.status(404).json({ msg: "Seller not found" });
      }

      seller.type = "user";
      await seller.save();
      res.json({ msg: "Seller account disabled successfully" });
  } catch (e) {
      res.status(500).json({ error: e.message });
  }
});

// Get seller statistics
adminRouter.get("/admin/seller-stats", admin, async (req, res) => {
  try {
      const totalSellers = await User.countDocuments({ type: "seller" });
      const pendingRequests = await SellerRequest.countDocuments({ status: "pending" });
      
      res.json({
          totalSellers,
          pendingRequests
      });
  } catch (e) {
      res.status(500).json({ error: e.message });
  }
});



module.exports = adminRouter;