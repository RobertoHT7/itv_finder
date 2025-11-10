import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { testConnection } from "./api/test";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req: Request, res: Response) => res.json({ status: "API ITV Finder running" }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ Backend running on ${PORT}`));

app.get("/api/test-db", testConnection);