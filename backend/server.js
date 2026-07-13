import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import { initSocket } from "./socket.js";
import "./cron/interestCron.js";
import "./cron/loanRepaymentCron.js";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import supportRoutes from "./routes/supportRoutes.js";
import billRoutes from "./routes/billRoutes.js";
import moneyRequestRoutes from "./routes/moneyRequestRoutes.js";
import loanRoutes from "./routes/loanRoutes.js";
import announcementRoutes from "./routes/announcementRoutes.js";
import grantRoutes from "./routes/grantRoutes.js";
import taxRefundRoutes from "./routes/taxRefundRoutes.js";

connectDB();

const app = express();
const httpServer = http.createServer(app);

app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
    credentials: true,
  })
);
app.use(express.json());
app.use(morgan("dev"));

app.get("/api/health", (req, res) => res.json({ status: "ok", bank: "Well Trust Bank API" }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/bills", billRoutes);
app.use("/api/requests", moneyRequestRoutes);
app.use("/api/loans", loanRoutes);
app.use("/api/announcements", announcementRoutes);

app.use("/api/grants", grantRoutes);
app.use("/api/tax-refunds", taxRefundRoutes);

// 404 handler
app.use((req, res) => res.status(404).json({ message: "Route not found" }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Internal server error" });
});

initSocket(httpServer);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Well Trust Bank API running on port ${PORT}`);
});
