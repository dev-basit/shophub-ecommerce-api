import express from "express";
import expressAsyncHandler from "express-async-handler";
import Product from "../models/products.js";
import { isAdmin, isAuth, isSellerOrAdmin } from "../utils/utils.js";
import ProductCategory from "../models/productCategories.js";
// import data from "../constants/data.js";

const router = express.Router();

router.get(
  "/",
  expressAsyncHandler(async (req, res) => {
    const filters = {};
    if (req.query.name) filters["name"] = { $regex: req.query.name, $options: "i" };

    if (req.query.category) {
      const category = await ProductCategory.findOne({ name: req.query.category });
      if (!category) return res.status(404).json({ message: "Category not found fo given name." });
      filters["category"] = category._id;
    }

    if (req.query.min && req.query.max)
      filters["price"] = { $gte: Number(req.query.min), $lte: Number(req.query.max) };

    if (req.query.rating) filters["rating"] = { $gte: req.query.rating };

    let sortOrder = {};
    if (req.query.order) {
      sortOrder =
        req.query.order === "lowest"
          ? { price: 1 }
          : req.query.order === "highest"
          ? { price: -1 }
          : req.query.order === "toprated"
          ? { rating: -1 }
          : { _id: -1 };
    }

    // pagination
    const pageSize = Number(req.query.pageSize) || 10;
    const page = Number(req.query.pageNumber) || 1;

    const products = await Product.find(filters)
      .populate("seller category")
      .sort(sortOrder)
      .skip(pageSize * (page - 1))
      .limit(pageSize);

    res.send(products);
  })
);

router.get(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    // TODO: pass req.query directly to find
    const product = await Product.findById(req.params.id).populate("seller category");
    if (product) res.send(product);
    else res.status(404).send({ message: "Product not found for given id." });
  })
);

router.post(
  "/",
  isAuth,
  isSellerOrAdmin,
  expressAsyncHandler(async (req, res) => {
    const productToAdd = new Product({
      name: req.body.name,
      price: req.body.price,
      image: req.body.image,
      category: req.body.category,
      brand: req.body.brand,
      countInStock: req.body.countInStock,
      description: req.body.description,
      seller: req.body.seller,
      // seller: req.user._id, // TODO: check which one is good

      // TODO: how this will be calculated
      //      rating: 1,
      // numReviews: 2, ,// it will be array containing objects with id of who review it, and comments
    });

    const createdProduct = await productToAdd.save();
    res.send({ message: "Product Created Successfully.", product: createdProduct });
  })
);

router.post(
  "/reviews/:id",
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (product) {
      if (product.reviews.find((x) => x.name === req.user.name)) {
        return res.status(400).send({ message: "You already submitted a review" });
      }
      const review = {
        name: req.user.name, // TODO: name is repeated
        comment: req.body.comment,
        rating: Number(req.body.rating),
        user: req.body.user,
      };
      product.reviews.push(review);
      product.numReviews = product.reviews.length;
      product.rating = product.reviews.reduce((a, c) => c.rating + a, 0) / product.reviews.length;
      const updatedProduct = await product.save();
      res.status(201).send({
        message: "Review Created",
        review: updatedProduct.reviews[updatedProduct.reviews.length - 1],
      });
    } else {
      res.status(404).send({ message: "Product not found for given id." });
    }
  })
);

router.put(
  "/:id",
  isAuth,
  isSellerOrAdmin,
  expressAsyncHandler(async (req, res) => {
    const productId = req.params.id;
    const product = await Product.findById(productId);
    if (product) {
      product.name = req.body.name || product.name;
      product.price = req.body.price || product.price;
      product.image = req.body.image || product.image;
      product.category = req.body.category || product.category;
      product.brand = req.body.brand || product.brand;
      product.countInStock = req.body.countInStock || product.countInStock;
      product.description = req.body.description || product.description;
      // TODO: add seller, business logic, seller is fixed or not
      // TODO: if any key is not present in req.body, pick the old value from produuct[key]

      const updatedProduct = await product.save();
      res.send({ message: "Product Updated Successfully.", product: updatedProduct });
    } else {
      res.status(404).send({ message: "Product not found for given id." });
    }
  })
);

router.delete(
  "/:id",
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (product) {
      const deletedProduct = await product.remove();
      res.send({ message: "Product Deleted Successfully.", product: deletedProduct });
    } else {
      res.status(404).send({ message: "Product not found for given id." });
    }
  })
);

// router.get(
//   "/seed",
//   expressAsyncHandler(async (req, res) => {
//     const createdProducts = await Product.insertMany(data.products);
//     res.send({ createdProducts });
//   })
// );

export default router;
