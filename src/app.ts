import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { json } from "body-parser";
import path from "path";

const app = express();

// Basic environment config
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";
const API_PREFIX = process.env.API_PREFIX ?? "/api";

// Middleware
app.use(json());
app.use(cookieParser());

// CORS: allow frontend origin and credentials (HttpOnly refresh cookie)
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin like mobile apps or curl
      if (!origin) return callback(null, true);
      if (Array.isArray(FRONTEND_ORIGIN)) {
        // support comma-separated env value
        const allowed = FRONTEND_ORIGIN.flatMap((o: string) =>
          o ? o.split(",") : []
        );
        return callback(null, allowed.includes(origin));
      }
      // single origin
      return callback(null, origin === FRONTEND_ORIGIN);
    },
    credentials: true,
    exposedHeaders: ["Authorization"],
  })
);

// Simple request logging in dev
if (process.env.NODE_ENV !== "production") {
  app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`
    );
    next();
  });
}

// Health-check route
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// API router placeholder
import { Router } from "express";
const apiRouter = Router();

// Mount auth routes
import authRoutes from "./features/auth/auth.routes";
import spacesRoutes from "./features/spaces/spaces.routes";
import bookingsRoutes from "./features/bookings/bookings.routes";

apiRouter.use("/auth", authRoutes);
apiRouter.use("/spaces", spacesRoutes);
apiRouter.use("/bookings", bookingsRoutes);

// For now, provide a small example endpoint to demonstrate auth-protected route placeholder
apiRouter.get("/public", (_req: Request, res: Response) => {
  res.json({ message: "Public endpoint - welcome" });
});

// Example protected route placeholder (middleware to be implemented later)
apiRouter.get("/protected", (req: Request, res: Response) => {
  res
    .status(401)
    .json({ message: "Protected resource - authentication required" });
});

app.use(API_PREFIX, apiRouter);

// Basic 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: "Not Found" });
});

// Central error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);
  const status = err.status ?? 500;
  const body = {
    message: err.message ?? "Internal Server Error",
    ...(process.env.NODE_ENV !== "production" ? { stack: err.stack } : {}),
  };
  res.status(status).json(body);
});

export default app;
