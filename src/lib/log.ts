import winston from "winston";
import path from "path";
import fs from "fs";

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Get current date for log filename
const currentDate = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
const logFilePath = path.join(logsDir, `scraper-${currentDate}.log`);

// Helper to format multiple arguments
function formatArgs(args: unknown[]): string {
  return args
    .map((arg) =>
      typeof arg === "string" ? arg : JSON.stringify(arg, null, 2)
    )
    .join(" ");
}

// Create a logger with customized levels
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ level, message, timestamp }) => {
      return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    })
  ),
  transports: [
    // Console transport with configurable level
    new winston.transports.Console(),

    // File transport that always logs everything
    new winston.transports.File({
      filename: logFilePath,
      level: "debug", // Always log everything to file
    }),
  ],
});

export const log = {
  debug: (...args: unknown[]) => logger.debug(formatArgs(args)),
  info: (...args: unknown[]) => logger.info(formatArgs(args)),
  warn: (...args: unknown[]) => logger.warn(formatArgs(args)),
  error: (...args: unknown[]) => logger.error(formatArgs(args)),
};
