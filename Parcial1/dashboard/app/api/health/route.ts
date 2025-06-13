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

    // Verificar la conexión a la base de datos
    await db.get('SELECT 1');

    await db.close();
    return NextResponse.json({ status: 'healthy' });
  } catch (error) {
    console.error('Error en el healthcheck:', error);
    return NextResponse.json(
      { status: 'unhealthy', error: 'Database connection failed' },
      { status: 503 }
    );
  }
} 