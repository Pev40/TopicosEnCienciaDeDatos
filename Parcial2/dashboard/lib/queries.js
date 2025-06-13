const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/dashboard.db');

class DashboardQueries {
  constructor() {
    this.db = new sqlite3.Database(DB_PATH);
  }

  // Obtener datos para un registro específico
  async getRecordData(recordId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM dashboard_mitdb WHERE Registro = ?',
        [recordId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  // Obtener estadísticas por símbolo
  async getSymbolStats() {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT 
          "Símbolo",
          COUNT(*) as count,
          AVG(MLII) as avg_mlii,
          AVG(V5) as avg_v5
        FROM dashboard_mitdb
        GROUP BY "Símbolo"
        ORDER BY count DESC
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // Obtener datos para visualización de ECG
  async getECGData(recordId, startSample, endSample) {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT 
          Sample,
          MLII,
          V5
        FROM dashboard_mitdb
        WHERE Registro = ?
        AND Sample BETWEEN ? AND ?
        ORDER BY Sample
      `, [recordId, startSample, endSample], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // Obtener distribución de símbolos por registro
  async getSymbolDistribution() {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT 
          Registro,
          "Símbolo",
          COUNT(*) as count
        FROM dashboard_mitdb
        GROUP BY Registro, "Símbolo"
        ORDER BY Registro, count DESC
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // Obtener estadísticas generales
  async getGeneralStats() {
    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT 
          COUNT(DISTINCT Registro) as total_records,
          COUNT(DISTINCT "Símbolo") as total_symbols,
          AVG(MLII) as avg_mlii,
          AVG(V5) as avg_v5,
          MIN(Sample) as min_sample,
          MAX(Sample) as max_sample
        FROM dashboard_mitdb
      `, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  // Cerrar la conexión
  close() {
    this.db.close();
  }
}

// Ejemplo de uso
async function testQueries() {
  const queries = new DashboardQueries();
  
  try {
    console.log('Probando consultas...\n');

    // Probar estadísticas generales
    const stats = await queries.getGeneralStats();
    console.log('Estadísticas generales:', stats);

    // Probar estadísticas por símbolo
    const symbolStats = await queries.getSymbolStats();
    console.log('\nEstadísticas por símbolo:', symbolStats.slice(0, 5));

    // Probar obtención de datos de ECG
    const ecgData = await queries.getECGData(100, 1, 100);
    console.log('\nDatos de ECG (primeros 5):', ecgData.slice(0, 5));

  } catch (error) {
    console.error('Error al probar consultas:', error);
  } finally {
    queries.close();
  }
}

if (require.main === module) {
  testQueries();
}

module.exports = DashboardQueries; 