import { NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data/dashboard.db');

// Mapeo de símbolos a tipos de eventos
const SYMBOL_MAP: Record<string, { type: string; description: string; color: string }> = {
  'N': { type: 'normal', description: 'Latido normal', color: '#4CAF50' },
  'L': { type: 'lbbb', description: 'Latido de bloqueo de rama izquierda', color: '#2196F3' },
  'R': { type: 'rbbb', description: 'Latido de bloqueo de rama derecha', color: '#FFC107' },
  'V': { type: 'pvc', description: 'Latido ventricular prematuro', color: '#F44336' },
  'A': { type: 'apb', description: 'Latido auricular prematuro', color: '#FF9800' },
  'F': { type: 'fusion', description: 'Latido de fusión', color: '#9C27B0' },
  '/': { type: 'vfusion', description: 'Latido de fusión ventricular', color: '#9C27B0' },
  'f': { type: 'afusion', description: 'Latido de fusión auricular', color: '#9C27B0' },
  'j': { type: 'nodal', description: 'Latido de escape nodal', color: '#795548' },
  'E': { type: 'vescape', description: 'Latido de escape ventricular', color: '#00BCD4' },
  'a': { type: 'aberrant', description: 'Latido auricular aberrante', color: '#607D8B' },
  'J': { type: 'junction', description: 'Latido de escape de la unión', color: '#795548' },
  'S': { type: 'pacemaker', description: 'Latido de marcapasos', color: '#E91E63' },
  'e': { type: 'vaberrant', description: 'Latido ventricular aberrante', color: '#00BCD4' },
  'Q': { type: 'unknown', description: 'Latido desconocido', color: '#9E9E9E' },
  '+': { type: 'unknown', description: 'Latido desconocido', color: '#9E9E9E' }
};

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
    
    // Obtener estadísticas de latidos
    const data = await db.all(
      `SELECT 
        "Símbolo",
        COUNT(*) as count
      FROM dashboard_mitdb
      WHERE Registro = ?
      AND "Símbolo" IS NOT NULL
      AND "Símbolo" NOT IN ('Q', '+', '')
      AND TRIM("Símbolo") != ''
      GROUP BY "Símbolo"
      ORDER BY count DESC`,
      [recordId]
    );

    // Transformar los datos al formato esperado por el frontend
    const transformedData = {
      recordId,
      totalBeats: data.reduce((sum, row) => sum + row.count, 0),
      beatTypes: data.map(row => {
        const symbol = row["Símbolo"] as string;
        const eventInfo = SYMBOL_MAP[symbol] || SYMBOL_MAP['Q'];
        
        return {
          type: eventInfo.type,
          description: eventInfo.description,
          color: eventInfo.color,
          count: row.count
        };
      })
    };

    await db.close();
    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    return NextResponse.json(
      { error: 'Error al obtener estadísticas' },
      { status: 500 }
    );
  }
} 