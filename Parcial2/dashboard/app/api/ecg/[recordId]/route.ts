import { NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data/dashboard.db');

// Configuración de optimización
const MAX_POINTS = 5000; // Máximo número de puntos a enviar
const SAMPLE_RATE = 360; // Hz

// Lista de todas las posibles derivaciones
const ALL_LEADS = ['MLII', 'V1', 'V2', 'V4', 'V5'];

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
    const { searchParams } = new URL(request.url);
    const start = parseInt(searchParams.get('start') || '0');
    const end = parseInt(searchParams.get('end') || '30'); // Solo 30 segundos por defecto
    
    // Primero, detectar qué derivaciones están disponibles para este registro
    const availableLeadsQuery = await db.get(
      `SELECT 
        CASE WHEN MLII IS NOT NULL AND TRIM(MLII) != '' AND MLII != '0' THEN 'MLII' ELSE '' END as hasMLII,
        CASE WHEN V1 IS NOT NULL AND TRIM(V1) != '' AND V1 != '0' THEN 'V1' ELSE '' END as hasV1,
        CASE WHEN V2 IS NOT NULL AND TRIM(V2) != '' AND V2 != '0' THEN 'V2' ELSE '' END as hasV2,
        CASE WHEN V4 IS NOT NULL AND TRIM(V4) != '' AND V4 != '0' THEN 'V4' ELSE '' END as hasV4,
        CASE WHEN V5 IS NOT NULL AND TRIM(V5) != '' AND V5 != '0' THEN 'V5' ELSE '' END as hasV5
      FROM dashboard_mitdb
      WHERE Registro = ?
      LIMIT 1`,
      [recordId]
    );

    if (!availableLeadsQuery) {
      return NextResponse.json(
        { error: 'Registro no encontrado' },
        { status: 404 }
      );
    }

    // Determinar las derivaciones disponibles
    const availableLeads: string[] = [];
    const selectFields = ['Sample'];
    
    if (availableLeadsQuery.hasMLII) {
      availableLeads.push('MLII');
      selectFields.push('MLII');
    }
    if (availableLeadsQuery.hasV1) {
      availableLeads.push('V1');
      selectFields.push('V1');
    }
    if (availableLeadsQuery.hasV2) {
      availableLeads.push('V2');
      selectFields.push('V2');
    }
    if (availableLeadsQuery.hasV4) {
      availableLeads.push('V4');
      selectFields.push('V4');
    }
    if (availableLeadsQuery.hasV5) {
      availableLeads.push('V5');
      selectFields.push('V5');
    }

    if (availableLeads.length === 0) {
      return NextResponse.json(
        { error: 'No hay derivaciones disponibles para este registro' },
        { status: 400 }
      );
    }

    // Calcular decimación necesaria
    const totalSamples = (end - start) * SAMPLE_RATE;
    const decimation = Math.max(1, Math.ceil(totalSamples / MAX_POINTS));

    let query = '';
    let queryParams = [];

    if (decimation === 1) {
      // Sin decimación - enviar todos los puntos
      query = `SELECT 
        ${selectFields.join(', ')}
      FROM dashboard_mitdb
      WHERE Registro = ?
      AND CAST(Sample AS INTEGER) BETWEEN ? AND ?
      ORDER BY CAST(Sample AS INTEGER)`;
      queryParams = [recordId, start * SAMPLE_RATE, end * SAMPLE_RATE];
    } else {
      // Con decimación - tomar cada N muestras
      query = `SELECT 
        ${selectFields.join(', ')}
      FROM dashboard_mitdb
      WHERE Registro = ?
      AND CAST(Sample AS INTEGER) BETWEEN ? AND ?
      AND (CAST(Sample AS INTEGER) - ?) % ? = 0
      ORDER BY CAST(Sample AS INTEGER)`;
      queryParams = [recordId, start * SAMPLE_RATE, end * SAMPLE_RATE, start * SAMPLE_RATE, decimation];
    }

    // Obtener datos del ECG
    const data = await db.all(query, queryParams);

    // Limitar la respuesta como medida de seguridad adicional
    const limitedData = data.slice(0, MAX_POINTS);

    // Transformar los datos al formato esperado por el frontend
    const transformedData = {
      recordId,
      sampleRate: SAMPLE_RATE,
      decimation: decimation,
      actualPoints: limitedData.length,
      timeRange: { start, end },
      leads: availableLeads,
      data: limitedData.map(row => {
        const time = parseInt(row.Sample) / SAMPLE_RATE;
        const values: any = {};
        
        // Agregar dinámicamente las derivaciones disponibles
        availableLeads.forEach(lead => {
          values[lead] = parseFloat(row[lead] || '0');
        });

        return {
          time,
          values
        };
      })
    };

    await db.close();
    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('Error al obtener datos del ECG:', error);
    return NextResponse.json(
      { error: 'Error al obtener datos del ECG' },
      { status: 500 }
    );
  }
} 