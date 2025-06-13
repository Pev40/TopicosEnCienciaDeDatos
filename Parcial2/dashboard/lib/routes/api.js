const express = require('express');
const router = express.Router();
const DashboardQueries = require('../queries');

// Middleware para manejar la conexión a la base de datos
const dbMiddleware = (req, res, next) => {
  req.queries = new DashboardQueries();
  res.on('finish', () => {
    if (req.queries) {
      req.queries.close();
    }
  });
  next();
};

// Aplicar el middleware a todas las rutas
router.use(dbMiddleware);

// Obtener datos del paciente
router.get('/patient/:recordId', async (req, res) => {
  try {
    const { recordId } = req.params;
    const data = await req.queries.getRecordData(parseInt(recordId));
    
    if (!data) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }

    // Transformar los datos al formato esperado por el frontend
    const patientData = {
      name: "Paciente MIT-BIH",
      age: 67,
      gender: "F",
      recordId: `MIT-BIH-${recordId}`,
      status: "observation",
      avgHR: 75,
      dominantArrhythmia: "PVC ocasionales"
    };
    
    res.json(patientData);
  } catch (error) {
    console.error('Error al obtener datos del paciente:', error);
    res.status(500).json({ error: 'Error al obtener datos del paciente' });
  }
});

// Obtener datos de ECG para visualización
router.get('/ecg/:recordId', async (req, res) => {
  try {
    const { recordId } = req.params;
    const { start = 0, end = 1000 } = req.query;
    
    const data = await req.queries.getECGData(
      parseInt(recordId),
      parseInt(start),
      parseInt(end)
    );
    
    // Transformar los datos al formato esperado por el frontend
    const transformedData = data.map(row => ({
      time: parseInt(row.Sample) / 360, // Convertir a segundos (360 Hz sampling rate)
      MLII: parseFloat(row.MLII),
      V5: parseFloat(row.V5),
      sample: parseInt(row.Sample)
    }));
    
    res.json(transformedData);
  } catch (error) {
    console.error('Error al obtener datos de ECG:', error);
    res.status(500).json({ error: 'Error al obtener datos de ECG' });
  }
});

// Obtener eventos detectados
router.get('/events/:recordId', async (req, res) => {
  try {
    const { recordId } = req.params;
    const data = await req.queries.getSymbolDistribution();
    
    // Filtrar eventos para el registro específico
    const recordEvents = data.filter(event => event.Registro === parseInt(recordId));
    
    // Transformar los datos al formato esperado por el frontend
    const events = recordEvents.map((event, index) => ({
      id: index + 1,
      time: parseInt(event.Sample) / 360, // Convertir a segundos
      symbol: event['Símbolo'],
      type: getEventType(event['Símbolo']),
      description: getEventDescription(event['Símbolo']),
      color: getEventColor(event['Símbolo'])
    }));
    
    res.json(events);
  } catch (error) {
    console.error('Error al obtener eventos:', error);
    res.status(500).json({ error: 'Error al obtener eventos' });
  }
});

// Obtener estadísticas
router.get('/statistics/:recordId', async (req, res) => {
  try {
    const { recordId } = req.params;
    const stats = await req.queries.getSymbolStats();
    
    // Transformar los datos al formato esperado por el frontend
    const statistics = {
      hrAvg: 75,
      hrMin: 62,
      hrMax: 89,
      beatTypes: stats.map(stat => ({
        type: `${getEventType(stat['Símbolo'])} (${stat['Símbolo']})`,
        count: stat.count,
        percentage: (stat.count / stats.reduce((acc, curr) => acc + curr.count, 0) * 100).toFixed(1),
        color: getEventColor(stat['Símbolo'])
      })),
      hrv: 42.3,
      qrsAvg: 98
    };
    
    res.json(statistics);
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

// Funciones auxiliares para mapear símbolos a tipos de eventos
function getEventType(symbol) {
  const types = {
    'N': 'Normal',
    'V': 'PVC',
    'A': 'APC',
    'L': 'LBBB',
    'R': 'RBBB',
    'F': 'Fusion',
    '': 'Unknown'
  };
  return types[symbol] || 'Unknown';
}

function getEventDescription(symbol) {
  const descriptions = {
    'N': 'Latido normal',
    'V': 'Contracción ventricular prematura',
    'A': 'Contracción auricular prematura',
    'L': 'Bloqueo de rama izquierda',
    'R': 'Bloqueo de rama derecha',
    'F': 'Latido de fusión',
    '': 'Evento desconocido'
  };
  return descriptions[symbol] || 'Evento desconocido';
}

function getEventColor(symbol) {
  const colors = {
    'N': 'green',
    'V': 'red',
    'A': 'yellow',
    'L': 'red',
    'R': 'red',
    'F': 'yellow',
    '': 'gray'
  };
  return colors[symbol] || 'gray';
}

module.exports = router; 