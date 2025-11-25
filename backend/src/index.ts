import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { testConnection } from "./api/test";
import { getCVStations } from "./wrappers/wrapperCV";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req: Request, res: Response) => res.json({ status: "API ITV Finder running" }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ Backend running on ${PORT}`));
console.log(`http://localhost:${PORT}`);

app.get("/api/cv", getCVStations);