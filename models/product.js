// server/models/product.js

const mongoose = require("mongoose");
const ratingSchema = require("./rating");
const commentSchema = require("./comment");
const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  images: [
    {
      type: String,
      required: true,
    },
  ],
  quantity: {
    type: Number,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
},
  ratings: [ratingSchema],
  avgRating: {
      type: Number,
      default: 0,
  },
  discount: {
    type: Number,
    default: 0,
  },
  startDate: {
    type: Date,
    default: null,
  },
  endDate: {
    type: Date, 
    default: null,
  },
  // Thêm field này để lưu giá sau khi giảm
  finalPrice: {
    type: Number,
    default: function() {
      return this.price;
    }
  },
  comments: [commentSchema],
  commentCount: {  // Thêm trường đếm số comment
    type: Number,
    default: 0
  }
});


// Thêm middleware để tự động tính finalPrice
productSchema.methods.calculateFinalPrice = function() {
  const now = new Date();
  if (this.discount > 0 && 
      this.startDate && 
      this.endDate && 
      now >= this.startDate && 
      now <= this.endDate) {
    return this.price * (1 - this.discount / 100);
  }
  return this.price;
};

// Middleware pre-save
productSchema.pre('save', function(next) {
  if (this.discount > 0) {
      this.finalPrice = this.price * (1 - this.discount / 100);
  } else {
      this.finalPrice = this.price;
  }
   // Cập nhật commentCount khi có thay đổi trong comments
   this.commentCount = this.comments.length;
   
  next();
});


const Product = mongoose.model("Product", productSchema);
module.exports = { Product, productSchema };
