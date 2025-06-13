import { NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data/dashboard.db');

export async function GET(
  request: Request,
  { params }: { params: { recordId: string } }
) {
  try {
    const db = await open({
      filename: DB_PATH,
      driver: sqlite3.Database
    });

    const { recordId } = await params;
    
    // Obtener datos del paciente
    const data = await db.get(
      `SELECT 
        Registro,
        "Descripción"
      FROM dashboard_mitdb
      WHERE Registro = ?
      LIMIT 1`,
      [recordId]
    );

    if (!data) {
      return NextResponse.json(
        { error: 'Registro no encontrado' },
        { status: 404 }
      );
    }

    // Transformar los datos al formato esperado por el frontend
    const transformedData = {
      recordId: data.Registro,
      description: data["Descripción"]
    };

    await db.close();
    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('Error al obtener datos del paciente:', error);
    return NextResponse.json(
      { error: 'Error al obtener datos del paciente' },
      { status: 500 }
    );
  }
} 