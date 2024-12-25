const express = require("express");
const User = require("../models/user");
const authRouter = express.Router();
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const auth = require("../middlewares/auth");


authRouter.use(express.json());

// SIGN UP
authRouter.post("/api/signup", async (req, res) => {
  try {
      const { name, email, password } = req.body;
      const existingUser = await User.findOne({ email });
      if (existingUser) {
          return res.status(400).json({ msg: "Email address already exists" });
      }
      if (password.length < 6) {
          return res.status(400).json({ msg: "Password must be at least 6 characters" });
      }
      const hashedPassword = await bcryptjs.hash(password, 8);
      let user = new User({
          email,
          password: hashedPassword,
          name,
      });
      user = await user.save();
      res.json(user);
  } catch (e) {
      res.status(500).json({ error: e.message });
  }

});

// Sign In Route
authRouter.post("/api/signin", async (req, res) => {
  try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });
      if (!user) {
          return res.status(400).json({ msg: "User with this email does not exist!" });
      }
      const isMatch = await bcryptjs.compare(password, user.password);
      if (!isMatch) {
          return res.status(400).json({ msg: "Incorrect password!" });
      }
      const token = jwt.sign({ id: user._id }, "passwordKey");
      res.json({ token, ...user._doc });
  } catch (e) {
      res.status(500).json({ error: e.message });
  }
});

// Check Token
authRouter.post("/tokenIsValid", async (req, res) => {
  try {
      const token = req.header("x-auth-token");
      if (!token) return res.json(false);
      const verified = jwt.verify(token, "passwordKey");
      if (!verified) return res.json(false);
      const user = await User.findById(verified.id);
      if (!user) return res.json(false);
      res.json(true);
  } catch (e) {
      res.status(500).json({ error: e.message });
  }
});

// get user data
authRouter.get('/', auth, async (req, res) => {
  const user = await User.findById(req.user);
  res.json({ ...user._doc, token: req.token });
});


// Reset Password Route - Step 1: Get reset token
authRouter.post("/api/reset-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: "User with this email does not exist!" });
    }
    
    const resetToken = jwt.sign(
      { id: user._id },
      "passwordResetKey",
      { expiresIn: '1h' }
    );

    res.json({ resetToken });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update Password Route - Step 2: Update password
authRouter.post("/api/update-password", async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    
    if (!resetToken || !newPassword) {
      return res.status(400).json({ msg: "Missing required fields" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ msg: "Password must be at least 6 characters" });
    }

    const verified = jwt.verify(resetToken, "passwordResetKey");
    if (!verified) {
      return res.status(400).json({ msg: "Invalid or expired reset token" });
    }

    const hashedPassword = await bcryptjs.hash(newPassword, 8);
    const user = await User.findByIdAndUpdate(
      verified.id,
      { password: hashedPassword },
      { new: true }
    );

    if (!user) {
      return res.status(400).json({ msg: "User not found" });
    }

    res.json({ msg: "Password updated successfully" });
  } catch (e) {
    if (e.name === 'JsonWebTokenError') {
      res.status(400).json({ msg: "Invalid reset token" });
    } else {
      res.status(500).json({ error: e.message });
    }
  }
});
// Đăng nhập bằng Google
authRouter.post("/api/google-signin", async (req, res) => {
  try {
    const { email, name, googleId } = req.body;

    // Tìm user theo googleId hoặc email
    let user = await User.findOne({
      $or: [{ googleId: googleId }, { email: email }],
    });

    if (!user) {
      // Tạo user mới nếu chưa tồn tại
      user = new User({
        email,
        name,
        googleId,
        type: "user",
        address: "",
        cart: [],
      });
      user = await user.save();
    } else if (!user.googleId) {
      // Nếu user đã tồn tại nhưng chưa có googleId
      user.googleId = googleId;
      await user.save();
    }

    const token = jwt.sign({ id: user._id }, "passwordKey");
    res.json({ token, ...user._doc });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


module.exports = authRouter;
