const mongoose = require('mongoose');
const { productSchema } = require('./product');

const userSchema = mongoose.Schema({
  name: {
    required: true,
    type: String,
    trim: true,
  },
  email: {
    required: true,
    type: String,
    trim: true,
    unique: true,
    validate: {
      validator: (value) => {
        const re = /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
        return value.match(re);
      },
      message: 'Please enter a valid email address',
    },
  },
  password: {
    required: true,
    type: String,
    validate: {
      validator: (value) => {
        return value.length > 6;
      },
      message: 'Please enter a longer password',
    },
  },
  address: {
    type: String,
    default: '',
  },
  type: {
    type: String,
    
    enum: ['user', 'admin', 'seller'],
    default: 'user'
  },
  cart: [
    {
      product: productSchema,
      quantity: {
        type: Number,
        required: true,
      },
    },
  ],
  // Thêm các trường mới cho seller
  shopName: {
    type: String,
    default: '',
  },
  shopDescription: {
    type: String,
    default: '',
  },
  shopAvatar: {
    type: String,
    default: '',
  },
  // Thêm trường followers và following
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    
  }],
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
   
  }],
  // Thêm trường cho Google Sign In
  googleId: {
    type: String,
    sparse: true,
    unique: true,
  },
});



const User = mongoose.model('User', userSchema);
module.exports = User;