import { Request, Response } from "express";
import { supabase } from "../db/supabaseClient";

export const getCVStations = async (req: Request, res: Response) => {
    const { data, error } = await supabase
        .from("estacion")
        .select("*"); // o filtrar por código

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
};
