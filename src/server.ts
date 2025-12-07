import dotenv from "dotenv";
dotenv.config();

import http from "http";
import app from "./app";

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`🚀 Backend server listening on port ${PORT}`);
  if (process.env.NODE_ENV !== "production") {
    console.log(`  - Environment: ${process.env.NODE_ENV ?? "development"}`);
  }
});

// Graceful shutdown
const shutdown = (signal: string) => {
  console.info(`\n🛑 Received ${signal}. Closing server...`);
  server.close((err?: Error) => {
    if (err) {
      console.error("Error while closing server:", err);
      process.exit(1);
    }
    console.info("Server closed. Bye.");
    process.exit(0);
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
