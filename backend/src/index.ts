import { createApp } from "./app";
import { openDatabase } from "./db";

const port = Number(process.env.PORT ?? 4000);
const db = openDatabase();
const app = createApp(db);

const server = app.listen(port, "127.0.0.1", () => {
  console.log(`[Sift Orchestrator] http://127.0.0.1:${port}`);
});

process.on("SIGINT", () => {
  server.close(() => {
    db.close();
    process.exit(0);
  });
});
