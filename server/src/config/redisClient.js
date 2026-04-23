import "dotenv/config";
import { Redis } from "ioredis";

export const connection = new Redis(process.env.REDIS_HOST, {
  maxRetriesPerRequest: null,
});