import mongoose from "mongoose";

const productCategory = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, minlength: 1, maxlength: 150 },
  },
  {
    timestamps: true,
  }
);

const ProductCategory = mongoose.model("ProductCategory", productCategory);
export default ProductCategory;
