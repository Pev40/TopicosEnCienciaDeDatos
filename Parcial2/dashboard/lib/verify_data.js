const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/dashboard.db');

async function verifyData() {
  const db = new sqlite3.Database(DB_PATH);
  
  console.log('Verificando datos en la base de datos...\n');

  // Verificar el total de registros
  db.get('SELECT COUNT(*) as total FROM dashboard_mitdb', (err, row) => {
    if (err) {
      console.error('Error al contar registros:', err);
    } else {
      console.log(`Total de registros: ${row.total.toLocaleString()}`);
    }
  });

  // Verificar valores nulos por columna
  const columns = ['MLII', 'V5', 'Sample', 'Símbolo', 'Descripción', 'Registro', 'V1', 'V2', 'V4'];
  
  columns.forEach(column => {
    db.get(`SELECT COUNT(*) as nulls FROM dashboard_mitdb WHERE "${column}" IS NULL`, (err, row) => {
      if (err) {
        console.error(`Error al verificar nulos en ${column}:`, err);
      } else {
        console.log(`Valores nulos en ${column}: ${row.nulls.toLocaleString()}`);
      }
    });
  });

  // Verificar estadísticas básicas para columnas numéricas
  const numericColumns = ['MLII', 'V5', 'Sample', 'Registro', 'V1', 'V2', 'V4'];
  
  numericColumns.forEach(column => {
    db.get(`
      SELECT 
        MIN("${column}") as min,
        MAX("${column}") as max,
        AVG("${column}") as avg
      FROM dashboard_mitdb
      WHERE "${column}" IS NOT NULL
    `, (err, row) => {
      if (err) {
        console.error(`Error al calcular estadísticas para ${column}:`, err);
      } else {
        console.log(`\nEstadísticas para ${column}:`);
        console.log(`  Mínimo: ${row.min}`);
        console.log(`  Máximo: ${row.max}`);
        console.log(`  Promedio: ${row.avg.toFixed(2)}`);
      }
    });
  });

  // Verificar valores únicos en columnas categóricas
  const categoricalColumns = ['Símbolo', 'Descripción'];
  
  categoricalColumns.forEach(column => {
    db.get(`SELECT COUNT(DISTINCT "${column}") as unique_values FROM dashboard_mitdb`, (err, row) => {
      if (err) {
        console.error(`Error al contar valores únicos en ${column}:`, err);
      } else {
        console.log(`\nValores únicos en ${column}: ${row.unique_values}`);
      }
    });
  });

  // Cerrar la conexión después de un tiempo razonable
  setTimeout(() => {
    db.close((err) => {
      if (err) {
        console.error('Error al cerrar la base de datos:', err);
      } else {
        console.log('\nVerificación completada.');
      }
    });
  }, 5000); // Esperar 5 segundos para que se completen las consultas
}

if (require.main === module) {
  verifyData();
} 