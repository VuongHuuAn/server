const jwt = require("jsonwebtoken");
const User = require("../models/user");
const auth = async (req, res, next) => {
  try {
    const token = req.header("x-auth-token");
    if (!token)
      return res.status(401).json({ msg: "No auth token, access denied" });
    const verified = jwt.verify(token, "passwordKey");
    if (!verified)
      return res
        .status(401)
        .json({ msg: "Token verification failed, authorization denied." });

    // Lấy thông tin user từ database
    const user = await User.findById(verified.id);
    if (!user) return res.status(401).json({ msg: "User not found" });
    // Thêm thông tin vào request
    req.user = verified.id;
    req.userName = user.name; // Thêm userName vào request
    req.token = token;
    console.log("Auth middleware - User info:", {
      userId: req.user,
      userName: req.userName,
    });
    next();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
module.exports = auth;
