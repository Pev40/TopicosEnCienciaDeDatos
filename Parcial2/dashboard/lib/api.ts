const BASE_URL = '/api';

// Interfaces para los tipos de datos
export interface PatientData {
  recordId: string;
  description?: string;
}

export interface PatientInfo {
  recordId: string;
  totalSamples: number;
  duration: number;
  availableLeads: string[];
  maxTime: number;
}

export interface ECGDataPoint {
  time: number;
  values: Record<string, number>;
}

export interface ECGData {
  recordId: string;
  sampleRate: number;
  decimation: number;
  actualPoints: number;
  timeRange: { start: number; end: number };
  leads: string[];
  data: ECGDataPoint[];
}

export interface Event {
  time: number;
  type: string;
  description: string;
  color: string;
  sample: number;
}

export interface BeatType {
  type: string;
  description: string;
  color: string;
  count: number;
}

export interface Statistics {
  recordId: string;
  totalBeats: number;
  beatTypes: BeatType[];
}

// Función para obtener la lista de pacientes disponibles
export async function getPatients(): Promise<PatientInfo[]> {
  const response = await fetch(`${BASE_URL}/patients`);
  if (!response.ok) {
    throw new Error('Error al obtener lista de pacientes');
  }
  return response.json();
}

// Función para obtener datos del paciente
export async function getPatientData(recordId: string): Promise<PatientData> {
  const response = await fetch(`${BASE_URL}/patient/${recordId}`);
  if (!response.ok) {
    throw new Error('Error al obtener datos del paciente');
  }
  return response.json();
}

// Función para obtener datos de ECG
export async function getECGData(recordId: string, start: number, end: number): Promise<ECGData> {
  const response = await fetch(`${BASE_URL}/ecg/${recordId}?start=${start}&end=${end}`);
  if (!response.ok) {
    throw new Error('Error al obtener datos de ECG');
  }
  return response.json();
}

// Función para obtener eventos
export async function getEvents(recordId: string): Promise<Event[]> {
  const response = await fetch(`${BASE_URL}/events/${recordId}`);
  if (!response.ok) {
    throw new Error('Error al obtener eventos');
  }
  return response.json();
}

// Función para obtener estadísticas
export async function getStatistics(recordId: string): Promise<Statistics> {
  const response = await fetch(`${BASE_URL}/statistics/${recordId}`);
  if (!response.ok) {
    throw new Error('Error al obtener estadísticas');
  }
  return response.json();
}