import "dotenv/config";

import { getEnv } from "./config/env.js";
import { startServer } from "./server.js";

if (getEnv().PROCESS_ROLE === "worker") {
  throw new Error("API entrypoint cannot run with PROCESS_ROLE=worker. Use worker.ts.");
}

await startServer();
