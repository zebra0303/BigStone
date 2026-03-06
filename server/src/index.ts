import path from "path";
import * as dotenv from "dotenv";
// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import express from "express";
import cors from "cors";
import todosRouter from "./routes/todos";
import settingsRouter from "./routes/settings";
import attachmentsRouter from "./routes/attachments";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve uploaded files statically
app.use("/uploads", express.static(path.resolve(__dirname, "../../data/uploads")));

app.use("/api/todos", todosRouter);
app.use("/api/todos/attachments", attachmentsRouter);
app.use("/api/settings", settingsRouter);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
