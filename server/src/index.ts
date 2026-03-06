import path from "path";
import * as dotenv from "dotenv";
// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import express from "express";
import cors from "cors";
import todosRouter from "./routes/todos";
import settingsRouter from "./routes/settings";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use("/api/todos", todosRouter);
app.use("/api/settings", settingsRouter);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
