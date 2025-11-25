import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import type { Database } from "../../../shared/types";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase URL and Key must be provided in environment variables");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);
