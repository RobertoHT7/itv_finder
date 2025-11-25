import fs from "fs";
import path from "path";
import csv from "csv-parser";
import { supabase } from "../db/supabaseClient";
import { getOrCreateProvincia, getOrCreateLocalidad } from "../utils/dbHelpers";
import { validarDatosEstacion, type EstacionInsert, type TipoEstacion } from "../../../shared/types";

interface EstacionGAL {
    "NOME DA ESTACI�N": string;
    ENDEREZO: string;
    CONCELLO: string;
    "C�DIGO POSTAL": string;
    PROVINCIA: string;
    "TEL�FONO": string;
    HORARIO: string;
    "SOLICITUDE DE CITA PREVIA": string;
    "CORREO ELECTR�NICO": string;
    "COORDENADAS GMAPS": string;
}

function getCodigoProvincia(nombre: string): string {
    const map: Record<string, string> = {
        "A CORUÑA": "15",
        LUGO: "27",
        OURENSE: "32",
        PONTEVEDRA: "36",
    };
    return map[nombre.toUpperCase()] ?? "00";
}

export async function loadGALData() {
    const filePath = path.join(__dirname, "../../data/Estacions_ITV.csv");
    const results: EstacionGAL[] = [];

    return new Promise<void>((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csv({ separator: ";" }))
            .on("data", (row) => results.push(row))
            .on("end", async () => {
                console.log(`🔄 Cargando ${results.length} estaciones de Galicia...`);

                for (const est of results) {
                    const provinciaId = await getOrCreateProvincia(est.PROVINCIA);
                    if (!provinciaId) continue;

                    const localidadId = await getOrCreateLocalidad(est.CONCELLO, provinciaId);
                    if (!localidadId) continue;

                    const [lat, lon] = est["COORDENADAS GMAPS"]
                        ?.split(",")
                        ?.map((v) => parseFloat(v.trim())) || [0, 0];

                    const tipoEstacion: TipoEstacion = "Estacion Fija";

                    const estacionData: EstacionInsert = {
                        nombre: est["NOME DA ESTACI�N"] || "Sin nombre",
                        tipo: tipoEstacion,
                        direccion: est.ENDEREZO || "Sin dirección",
                        codigo_postal: est["C�DIGO POSTAL"] || "00000",
                        latitud: lat,
                        longitud: lon,
                        descripcion: `Estación ITV de ${est.CONCELLO} (${est["NOME DA ESTACI�N"]})`,
                        horario: est.HORARIO || "No especificado",
                        contacto: `Tel: ${est["TEL�FONO"]} / Email: ${est["CORREO ELECTR�NICO"]}`,
                        url: est["SOLICITUDE DE CITA PREVIA"] || "https://itv.gal",
                        localidadId,
                    };

                    // Validar datos antes de insertar
                    const errores = validarDatosEstacion(estacionData);
                    if (errores.length > 0) {
                        console.error(`❌ Datos inválidos para ${est.CONCELLO}:`, errores);
                        continue;
                    }

                    const { error } = await supabase.from("estacion").insert(estacionData as any);
                    if (error) console.error("❌ Error insertando GAL:", error.message);
                }

                console.log("✅ Datos de Galicia cargados correctamente");
                resolve();
            })
            .on("error", reject);
    });
}
