import express from "express";
import expressAsyncHandler from "express-async-handler";
import ProductCategory from "../models/productCategories.js";
import { isAuth, isSellerOrAdmin } from "../utils/utils.js";

const router = express.Router();

router.get(
  "/",
  expressAsyncHandler(async (req, res) => {
    const categories = await ProductCategory.find();
    res.send(categories);
  })
);

router.post(
  "/",
  isAuth,
  expressAsyncHandler(async (req, res) => {
    if (req.body.name) {
      const category = new ProductCategory({
        name: req.body.name,
      });

      const newCategory = await category.save();
      res.status(201).send({ message: "New Category Created Succesfully.", data: newCategory });
    } else {
      res.status(400).send({ message: "Please provide category name." });
    }
  })
);

export default router;
