"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const db_1 = require("./db");
const port = Number(process.env.PORT ?? 4000);
const db = (0, db_1.openDatabase)();
const app = (0, app_1.createApp)(db);
const server = app.listen(port, "127.0.0.1", () => {
    console.log(`[Sift Orchestrator] http://127.0.0.1:${port}`);
});
process.on("SIGINT", () => {
    server.close(() => {
        db.close();
        process.exit(0);
    });
});
