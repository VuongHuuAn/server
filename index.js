console.log("Hello World");
const express = require("express");
const authRouter = require("./routes/auth");
const { default: mongoose } = require("mongoose");
const PORT = 3000;
const app = express();
const DB =
  "mongodb+srv://anvuong156:super156@cluster0.zgceu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const adminRouter = require("./routes/admin");
const productRouter = require("./routes/product");
const userRouter = require("./routes/user");
app.use(express.json());
app.use(authRouter);
app.use(adminRouter);
app.use(productRouter);
app.use(userRouter);
app.use((req, res) => {
  res.status(404).json({ error: "Route không tồn tại" });
});
mongoose
  .connect(DB)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((e) => {
    console.log(e);
  });
app.listen(PORT, () => {
  console.log(`connected at port ${PORT}`);
});
module.exports = app;
