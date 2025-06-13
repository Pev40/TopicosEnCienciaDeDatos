import { NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data/dashboard.db');

export async function GET() {
  try {
    const db = await open({
      filename: DB_PATH,
      driver: sqlite3.Database
    });

    // Obtener lista de pacientes con sus derivaciones disponibles
    const data = await db.all(
      `SELECT 
        Registro,
        COUNT(*) as totalSamples,
        MIN(CAST(Sample AS INTEGER)) as minSample,
        MAX(CAST(Sample AS INTEGER)) as maxSample,
        CASE WHEN MLII IS NOT NULL AND TRIM(MLII) != '' AND MLII != '0' THEN 'MLII' ELSE '' END ||
        CASE WHEN V1 IS NOT NULL AND TRIM(V1) != '' AND V1 != '0' THEN ',V1' ELSE '' END ||
        CASE WHEN V2 IS NOT NULL AND TRIM(V2) != '' AND V2 != '0' THEN ',V2' ELSE '' END ||
        CASE WHEN V4 IS NOT NULL AND TRIM(V4) != '' AND V4 != '0' THEN ',V4' ELSE '' END ||
        CASE WHEN V5 IS NOT NULL AND TRIM(V5) != '' AND V5 != '0' THEN ',V5' ELSE '' END as availableLeads
      FROM dashboard_mitdb
      GROUP BY Registro
      ORDER BY Registro`
    );

    // Transformar los datos al formato esperado por el frontend
    const transformedData = data.map(row => {
      const leadsString = row.availableLeads as string;
      const leads = leadsString.split(',').filter(lead => lead.trim() !== '');
      
      return {
        recordId: row.Registro,
        totalSamples: row.totalSamples,
        duration: Math.round((row.maxSample - row.minSample) / 360), // duración en segundos
        availableLeads: leads,
        maxTime: (row.maxSample - row.minSample) / 360
      };
    });

    await db.close();
    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('Error al obtener lista de pacientes:', error);
    return NextResponse.json(
      { error: 'Error al obtener lista de pacientes' },
      { status: 500 }
    );
  }
} 