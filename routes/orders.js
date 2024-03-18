import express from "express";
import expressAsyncHandler from "express-async-handler";
import Order from "../models/orders.js";
import { isAdmin, isAuth, isSellerOrAdmin } from "../utils/utils.js";

const router = express.Router();

router.get(
  "/mine",
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const orders = await Order.find({ user: req.user._id });
    res.send(orders);
  })
);

router.get(
  "/",
  isAuth,
  isSellerOrAdmin,
  expressAsyncHandler(async (req, res) => {
    const filters = {};
    if (req.query.seller) filters["seller"] = req.query.seller;
    const orders = await Order.find(filters).populate("user", "name");
    res.send(orders);
  })
);

router.get(
  "/:id",
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (order) {
      res.send(order);
    } else {
      res.status(404).send({ message: "Order not found for given id." });
    }
  })
);

router.post(
  "/",
  isAuth,
  expressAsyncHandler(async (req, res) => {
    if (req.body.orderItems.length === 0) {
      res.status(400).send({ message: "Cart is empty." });
    } else {
      const order = new Order({
        seller: req.body.orderItems[0].seller, // TODO: we can get seller from product record
        orderItems: req.body.orderItems,
        shippingAddress: req.body.shippingAddress,
        paymentMethod: req.body.paymentMethod,
        itemsPrice: req.body.itemsPrice,
        shippingPrice: req.body.shippingPrice,
        taxPrice: req.body.taxPrice,
        totalPrice: req.body.totalPrice,
        user: req.user._id,
        // TODO: add location information, in models already added
      });

      const createdOrder = await order.save();
      res.status(201).send({ message: "New Order Created Succesfully.", order: createdOrder });
    }
  })
);

router.put(
  "/:id/pay",
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (order) {
      order.isPaid = true;
      order.paidAt = Date.now();
      order.paymentResult = {
        id: req.body.id,
        status: req.body.status,
        update_time: req.body.update_time,
        email_address: req.body.email_address,
      };
      const updatedOrder = await order.save();
      res.send({ message: "Order Paid", order: updatedOrder });
    } else {
      res.status(404).send({ message: "Order Not Found" });
    }
  })
);

router.delete(
  "/:id",
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (order) {
      const deletedOrder = await order.remove();
      res.send({ message: "Order Deleted Successfully.", order: deletedOrder });
    } else {
      res.status(404).send({ message: "Order not found for given id." });
    }
  })
);

router.put(
  "/deliver-order/:id",
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (order) {
      order.isDelivered = true;
      order.deliveredAt = Date.now();

      const updatedOrder = await order.save();
      res.send({ message: "Order Delivered Successfully.", order: updatedOrder });
    } else {
      res.status(404).send({ message: "Order not found for given id." });
    }
  })
);

export default router;
