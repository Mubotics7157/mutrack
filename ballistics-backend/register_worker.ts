// Run with: npx convex run ballistics-backend/register_worker.ts
// This script registers a new ML worker and outputs the API key

import { mutation } from "../convex/_generated/server";
import { v } from "convex/values";

// Note: This needs to be run as an admin user through the dashboard
// or via a custom admin endpoint

console.log(`
To register an ML worker, you need to:

1. Go to your Convex dashboard: https://dashboard.convex.dev
2. Navigate to your project (earnest-ant-348)
3. Go to the "Functions" tab
4. Find and run "mlWorkers:registerWorker" with these args:
   {
     "name": "local-dev-worker",
     "capabilities": ["trajectory_detection", "parameter_fitting"]
   }
5. Copy the returned apiKey and paste it in your .env file

Alternatively, add this to your app's admin UI to register workers.
`);
