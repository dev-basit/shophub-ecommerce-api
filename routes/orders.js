import express from "express";
import expressAsyncHandler from "express-async-handler";
import formData from "form-data";
import Mailgun from "mailgun.js";

import Order from "../models/orders.js";
import User from "../models/users.js";
import Product from "../models/products.js";
import { isAdmin, isAuth, isSellerOrAdmin } from "../utils/utils.js";

const mailgun = new Mailgun(formData);
const mg = mailgun.client({ username: "api", key: process.env.MAILGUN_API_KEY || "key-yourkeyhere" });

const router = express.Router();

router.get(
  "/mine",
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const orders = await Order.find({ user: req.user._id });
    res.send(orders);
  })
);

// TODO: use your credentials / sandbox / template
router.get(
  "/",
  isAuth,
  isSellerOrAdmin,
  expressAsyncHandler(async (req, res) => {
    const filters = {};
    if (req.query.seller) filters["seller"] = req.query.seller;
    const orders = await Order.find(filters).populate("user", "name");

    mg.messages
      .create("sandbox6e291884b1d34c1a856588ba28e39fe7.mailgun.org", {
        from: "Excited User <mailgun@sandbox-123.mailgun.org>",
        to: ["test@example.com"],
        subject: "Hello",
        text: "Testing some Mailgun awesomeness!",
        html: "<h1>Testing some Mailgun awesomeness!</h1>",
      })
      .then((msg) => console.log(msg)) // logs response data
      .catch((err) => console.log(err));

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

router.get(
  "/summary/details",
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const orders = await Order.aggregate([
      { $group: { _id: null, numOrders: { $sum: 1 }, totalSales: { $sum: "$totalPrice" } } },
    ]);

    const users = await User.aggregate([{ $group: { _id: null, numUsers: { $sum: 1 } } }]);
    const dailyOrders = await Order.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          orders: { $sum: 1 },
          sales: { $sum: "$totalPrice" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const productCategories = await Product.aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }]);
    res.send({ users, orders, dailyOrders, productCategories });
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
    const order = await Order.findById(req.params.id).populate("user", "email name");
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

      // mg.messages
      //   .create("sandbox6e291884b1d34c1a856588ba28e39fe7.mailgun.org", {
      //     from: "Excited User <mailgun@sandbox-123.mailgun.org>",
      //     to: ["test@example.com"],
      //     subject: "Hello",
      //     text: "Testing some Mailgun awesomeness!",
      //     html: "<h1>Testing some Mailgun awesomeness!</h1>",
      //   })
      //   .then((msg) => console.log(msg)) // logs response data
      //   .catch((err) => console.log(err));

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
