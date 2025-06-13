const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const csv = require('csv-parser');

const DB_PATH = path.join(__dirname, '../data/dashboard.db');
const CSV_PATH = path.join(__dirname, '../data/dataset_mitdb_completo.csv');

const MAX_SQL_VARIABLES = 999;
const COLUMNS_COUNT = 9;
const BATCH_SIZE = Math.floor(MAX_SQL_VARIABLES / COLUMNS_COUNT); // 111


// Crear la tabla con las columnas del CSV
function createTable(db) {
  return new Promise((resolve, reject) => {
    db.run(`CREATE TABLE IF NOT EXISTS dashboard_mitdb (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      MLII REAL,
      V5 REAL,
      Sample INTEGER,
      Simbolo TEXT,
      Descripcion TEXT,
      Registro INTEGER,
      V1 REAL,
      V2 REAL,
      V4 REAL
    )`, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function insertBatch(db, records) {
  return new Promise((resolve, reject) => {
    const placeholders = records.map(() => '( ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',');
    const values = records.flatMap(record => [
      parseFloat(record.MLII) || null,
      parseFloat(record.V5) || null,
      parseInt(record.Sample) || null,
      record['Símbolo'] || null,
      record['Descripción'] || null,
      parseInt(record.Registro) || null,
      parseFloat(record.V1) || null,
      parseFloat(record.V2) || null,
      parseFloat(record.V4) || null
    ]);

    const sql = `INSERT INTO dashboard_mitdb (
      MLII, V5, Sample, Simbolo, Descripcion,
      Registro, V1, V2, V4
    ) VALUES ${placeholders}`;

    db.run(sql, values, function(err) {
      if (err) {
        console.error('Error al insertar lote:', err);
        reject(err);
      } else {
        resolve(this.changes);
      }
    });
  });
}

async function importCSV() {
  const db = new sqlite3.Database(DB_PATH);
  await createTable(db);
  let batch = [];
  let totalProcessed = 0;
  let startTime = Date.now();

  const readStream = fs.createReadStream(CSV_PATH)
    .pipe(csv())
    .on('data', async (row) => {
      batch.push(row);
      if (batch.length >= BATCH_SIZE) {
        try {
          await insertBatch(db, batch);
          totalProcessed += batch.length;
          const elapsedTime = (Date.now() - startTime) / 1000;
          const recordsPerSecond = totalProcessed / elapsedTime;
          console.log(`Procesados ${totalProcessed} registros (${recordsPerSecond.toFixed(2)} registros/segundo)`);
          batch = [];
        } catch (error) {
          console.error('Error en el procesamiento del lote:', error);
          process.exit(1);
        }
      }
    })
    .on('end', async () => {
      if (batch.length > 0) {
        try {
          await insertBatch(db, batch);
          totalProcessed += batch.length;
        } catch (error) {
          console.error('Error en el procesamiento del último lote:', error);
          process.exit(1);
        }
      }

      const totalTime = (Date.now() - startTime) / 1000;
      console.log(`\nImportación completada:`);
      console.log(`Total de registros procesados: ${totalProcessed}`);
      console.log(`Tiempo total: ${totalTime.toFixed(2)} segundos`);
      console.log(`Promedio: ${(totalProcessed / totalTime).toFixed(2)} registros/segundo`);

      db.close((err) => {
        if (err) {
          console.error('Error al cerrar la base de datos:', err);
          process.exit(1);
        }
        console.log('Conexión a la base de datos cerrada');
        process.exit(0);
      });
    })
    .on('error', (error) => {
      console.error('Error al leer el archivo CSV:', error);
      process.exit(1);
    });
}

if (require.main === module) {
  importCSV();
}
