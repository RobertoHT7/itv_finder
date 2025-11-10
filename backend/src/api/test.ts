import { Request, Response } from "express";
import { supabase } from "../db/supabaseClient";

export const testConnection = async (req: Request, res: Response) => {
    try {
        const { data, error } = await supabase.from("test").select("*").limit(1);

        if (error) {
            return res.status(500).json({
                success: false,
                message: "Error connecting to database",
                error: error.message
            });
        }

        return res.json({
            success: true,
            message: "Database connection successful",
            data
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Unexpected error",
            error: error instanceof Error ? error.message : String(error)
        });
    }
};
