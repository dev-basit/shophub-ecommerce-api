import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";

import usersRouter from "./routes/users.js";
import productsRouter from "./routes/product.js";
import ordersRouter from "./routes/orders.js";
import productCategoryRouter from "./routes/productCategories.js";
import uploadRouter from "./routes/uploadRouter.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
});

app.get("/", (req, res) => res.send("Server is ready."));

app.use("/api/uploads", uploadRouter);
app.use("/api/users", usersRouter);
app.use("/api/products", productsRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/products-categories", productCategoryRouter);
app.get("/api/config/paypal", (req, res) => {
  res.send(process.env.PAYPAL_CLIENT_ID || "sb");
});

const __dirname = path.resolve();
app.use("/uploads", express.static(path.join(__dirname, "/uploads")));

// TODO: change this if you want to deploy frontend and backend separately
// app.use(express.static(path.join(__dirname, "/frontend/build")));
// app.get("*", (req, res) => res.sendFile(path.join(__dirname, "/frontend/build/index.html")));

// middleware for handling errors
app.use((err, req, res, next) => {
  res.status(500).send({ message: err.message });
});

const port = process.env.PORT || 5001;
app.listen(port, () => console.log(`Server is listening to the port ${port}`));
