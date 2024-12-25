const express = require('express');
const userRouter = express.Router();
const auth = require("../middlewares/auth");
const { Product } = require('../models/product');
const User = require('../models/user');
const Order = require("../models/order");
const Notification = require('../models/notification');



userRouter.post("/api/add-to-cart", auth, async (req, res) => {
    try {
        const { product: productId } = req.body;
        console.log('Request body:', req.body);
        console.log('Product ID:', productId);
        
        // Find product with seller info
        const product = await Product.findById(productId).populate('sellerId', 'shopName shopAvatar');
        console.log('Found product:', product);

        if (!product) {
            console.log('Product not found with id:', productId);
            return res.status(404).json({ error: 'Product not found' });
        }

        // Find user
        let user = await User.findById(req.user);
        console.log('Found user:', user);

        // Check if product already in cart
        const existingProduct = user.cart.find(
            (item) => item.product._id.toString() === productId
        );

        if (existingProduct) {
            // If product exists, increment quantity
            existingProduct.quantity += 1;
        } else {
            // Create cart item with full product info
            const cartProduct = {
                _id: product._id,
                name: product.name,
                description: product.description,
                images: product.images,
                quantity: product.quantity,
                price: product.price,
                category: product.category,
                sellerId: {
                    _id: product.sellerId._id,
                    shopName: product.sellerId.shopName,
                    shopAvatar: product.sellerId.shopAvatar
                },
                ratings: product.ratings || [],
                discount: product.discount || 0,
                finalPrice: product.finalPrice || product.price
            };

            // Add new cart item
            user.cart.push({
                product: cartProduct,
                quantity: 1
            });
        }

        // Save updated user
        user = await user.save();
        console.log('Updated user cart:', user.cart);

        // Send response
        res.json(user);

    } catch (e) {
        console.error('Add to cart error:', e);
        console.error('Error stack:', e.stack);
        res.status(500).json({ error: e.message });
    }
});
// Delete product from cart
// Delete item from cart completely
userRouter.delete("/api/delete-from-cart/:id", auth, async (req, res) => {
    try {
        const { id: productId } = req.params;
        console.log('Delete from cart:', productId);

        let user = await User.findById(req.user);
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        // Tìm index của sản phẩm cần xóa
        const itemIndex = user.cart.findIndex(item => 
            item.product._id.toString() === productId
        );
        
        // Nếu tìm thấy, xóa sản phẩm đó khỏi cart
        if (itemIndex > -1) {
            user.cart.splice(itemIndex, 1);
        }
        
        user = await user.save();

        // Tính subtotal
        const subtotal = user.cart.reduce((total, item) => 
            total + (item.product.finalPrice || item.product.price) * item.quantity, 0
        );

        res.json({
            user,
            message: 'Item removed from cart',
            subtotal
        });

    } catch (e) {
        console.error('Delete from cart error:', e.message);
        res.status(500).json({ error: e.message });
    }
});
// save user address
userRouter.post("/api/save-user-address", auth, async (req, res) => {
    try {
        const { address } = req.body;
        let user = await User.findById(req.user);
        user.address = address;
        user = await user.save();
        res.json(user);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get cart
userRouter.get("/api/cart", auth, async (req, res) => {
    try {
        const user = await User.findById(req.user);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json({ cart: user.cart });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = userRouter;

// order product
userRouter.post("/api/order", auth, async (req, res) => {
    try {
        const { cart, totalPrice, address } = req.body;
        let products = [];

        // Kiểm tra và cập nhật số lượng sản phẩm
        for (let i = 0; i < cart.length; i++) {
            let product = await Product.findById(cart[i].product._id);
            if (!product) {
                return res.status(404).json({ msg: `Product not found!` });
            }

            if (product.quantity >= cart[i].quantity) {
                // Cập nhật số lượng sản phẩm
                product.quantity -= cart[i].quantity;
                await product.save();

                // Tạo object product theo productSchema
                const orderProduct = {
                    name: product.name,
                    description: product.description,
                    images: product.images,
                    quantity: product.quantity,
                    price: product.price,
                    category: product.category,
                    sellerId: product.sellerId,
                    ratings: product.ratings,
                    avgRating: product.avgRating,
                    discount: product.discount,
                    startDate: product.startDate,
                    endDate: product.endDate,
                    finalPrice: product.finalPrice
                };

                // Thêm vào mảng products
                products.push({
                    product: orderProduct,
                    quantity: cart[i].quantity
                });
            } else {
                return res.status(400).json({ msg: `${product.name} is out of stock!` });
            }
        }

        // Cập nhật giỏ hàng của user
        let user = await User.findById(req.user);
        user.cart = [];
        user = await user.save();

        // Tạo đơn hàng mới
        let order = new Order({
            products,
            totalPrice,
            address,
            userId: req.user,
            orderedAt: new Date().getTime(),
            status: 0 // Trạng thái mặc định
        });

        order = await order.save();
        res.json(order);
    } catch (e) {
        console.error('Order error:', e);
        res.status(500).json({ error: e.message });
    }
});

// get my orders
userRouter.get("/api/orders/me", auth, async (req, res) => {
    try {
        console.log('Fetching orders for user:', req.user);
        
        const orders = await Order.find({ userId: req.user })
            .sort({ orderedAt: -1 });
        console.log('Found orders:', orders.length);

        // Tính toán lại finalPrice cho mỗi sản phẩm
        const updatedOrders = orders.map(order => {
            console.log('Processing order:', order._id);
            const orderObj = order.toObject();
            
            orderObj.products = orderObj.products.map(item => {
                const product = item.product;
                const originalPrice = product.price;
                const discount = product.discount || 0;
                
                // Log giá trị trước khi tính toán
                console.log('Product pricing:', {
                    productId: product._id,
                    originalPrice,
                    discount,
                    existingFinalPrice: product.finalPrice
                });

                if (!product.finalPrice) {
                    product.finalPrice = originalPrice * (1 - discount / 100);
                    console.log('Calculated new finalPrice:', product.finalPrice);
                }

                return {
                    ...item,
                    product
                };
            });
            return orderObj;
        });

        console.log('Sending response with updated orders');
        res.json(updatedOrders);
    } catch (e) {
        console.error('Get orders error:', e);
        console.error('Error stack:', e.stack);
        res.status(500).json({ error: e.message });
    }
});

// Get notifications for user
userRouter.get("/api/notifications", auth, async (req, res) => {
    try {
        const notifications = await Notification.find({ 
            userId: req.user 
        })
        .sort({ createdAt: -1 }) // Sort by newest first
        .limit(50); // Limit to last 50 notifications
        
        res.json(notifications);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Mark notification as read
userRouter.post("/api/notifications/mark-read/:id", auth, async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            {
                _id: req.params.id,
                userId: req.user
            },
            { isRead: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ msg: "Notification not found" });
        }

        res.json(notification);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Mark all notifications as read
userRouter.post("/api/notifications/mark-all-read", auth, async (req, res) => {
    try {
        await Notification.updateMany(
            { userId: req.user, isRead: false },
            { isRead: true }
        );
        
        res.json({ msg: "All notifications marked as read" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Delete notification
userRouter.delete("/api/notifications/:id", auth, async (req, res) => {
    try {
        const notification = await Notification.findOneAndDelete({
            _id: req.params.id,
            userId: req.user
        });

        if (!notification) {
            return res.status(404).json({ msg: "Notification not found" });
        }

        res.json({ msg: "Notification deleted successfully" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Delete all notifications for user
userRouter.delete("/api/notifications/delete-all", auth, async (req, res) => {
    try {
        await Notification.deleteMany({ userId: req.user });
        res.json({ msg: "All notifications deleted successfully" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Add option to clear notifications older than X days
userRouter.delete("/api/notifications/clear-old", auth, async (req, res) => {
    try {
        const daysOld = req.query.days || 30; // Default to 30 days
        const dateThreshold = new Date();
        dateThreshold.setDate(dateThreshold.getDate() - daysOld);

        await Notification.deleteMany({
            userId: req.user,
            createdAt: { $lt: dateThreshold }
        });

        res.json({ msg: `Notifications older than ${daysOld} days deleted` });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get product by ID
userRouter.get("/api/product/:id", auth, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        
        if (!product) {
            return res.status(404).json({ msg: "Product not found" });
        }
        
        res.json(product);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


module.exports = userRouter;
