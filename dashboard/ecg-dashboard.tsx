"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
  BarChart,
  Bar,
} from "recharts"
import { Heart, Activity, AlertTriangle, Filter, ZoomIn, ZoomOut, Play, Pause, ChevronLeft, ChevronRight, SkipBack, SkipForward, Users } from "lucide-react"
import { getPatients, getPatientData, getECGData, getEvents, getStatistics, type PatientData, type PatientInfo, type ECGData, type Event, type Statistics } from "@/lib/api"

export default function ECGDashboard() {
  const [timeWindow, setTimeWindow] = useState(30) // seconds
  const [currentTime, setCurrentTime] = useState(0)
  const [maxTime, setMaxTime] = useState(1800) // 30 minutos por defecto
  const [selectedEvent, setSelectedEvent] = useState<number | null>(null)
  const [eventFilter, setEventFilter] = useState("all")
  const [isPlaying, setIsPlaying] = useState(false)
  const [zoomLevel, setZoomLevel] = useState([1])
  const [recordId, setRecordId] = useState("100") // ID del registro por defecto
  const [originalTimeWindow, setOriginalTimeWindow] = useState(30) // Para guardar la ventana original

  // Estados para los datos
  const [patients, setPatients] = useState<PatientInfo[]>([])
  const [selectedPatient, setSelectedPatient] = useState<PatientInfo | null>(null)
  const [patientData, setPatientData] = useState<PatientData | null>(null)
  const [ecgData, setEcgData] = useState<any>({ data: [], actualPoints: 0, decimation: 1, leads: [] })
  const [events, setEvents] = useState<Event[]>([])
  const [statistics, setStatistics] = useState<Statistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cargar lista de pacientes al inicio
  useEffect(() => {
    const loadPatients = async () => {
      try {
        const patientsData = await getPatients()
        setPatients(patientsData)
        
        // Seleccionar el primer paciente o el paciente 100 si existe
        const defaultPatient = patientsData.find(p => p.recordId === "100") || patientsData[0]
        if (defaultPatient) {
          setSelectedPatient(defaultPatient)
          setRecordId(defaultPatient.recordId)
          setMaxTime(defaultPatient.maxTime)
        }
      } catch (err) {
        setError('Error al cargar la lista de pacientes')
        console.error('Error al cargar pacientes:', err)
      }
    }

    loadPatients()
  }, [])

  // Cargar datos cuando cambia el paciente seleccionado
  useEffect(() => {
    if (!selectedPatient) return

    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Cargar datos básicos
        const [patient, eventsData, stats] = await Promise.all([
          getPatientData(selectedPatient.recordId),
          getEvents(selectedPatient.recordId),
          getStatistics(selectedPatient.recordId)
        ])

        setPatientData(patient)
        setEvents(eventsData)
        setStatistics(stats)

        // Cargar datos de ECG para la ventana inicial
        await loadECGWindow(0, timeWindow)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar los datos')
        console.error('Error al cargar datos:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [selectedPatient])

  // Función para cambiar de paciente
  const handlePatientChange = (patientRecordId: string) => {
    const patient = patients.find(p => p.recordId === patientRecordId)
    if (patient) {
      setSelectedPatient(patient)
      setRecordId(patient.recordId)
      setMaxTime(patient.maxTime)
      setCurrentTime(0) // Resetear a tiempo inicial
    }
  }

  // Función para cargar ventana específica de ECG
  const loadECGWindow = async (start: number, duration: number) => {
    if (!selectedPatient) return
    
    try {
      const data = await getECGData(selectedPatient.recordId, start, start + duration)
      setEcgData(data)
      setCurrentTime(start)
    } catch (err) {
      console.error('Error al cargar ventana de ECG:', err)
    }
  }

  // Navegación temporal
  const goToPrevious = () => {
    const newStart = Math.max(0, currentTime - timeWindow)
    loadECGWindow(newStart, timeWindow)
  }

  const goToNext = () => {
    const newStart = Math.min(maxTime - timeWindow, currentTime + timeWindow)
    loadECGWindow(newStart, timeWindow)
  }

  const goToStart = () => {
    loadECGWindow(0, timeWindow)
  }

  const goToTime = (time: number) => {
    const newStart = Math.max(0, Math.min(maxTime - timeWindow, time))
    loadECGWindow(newStart, timeWindow)
  }

  // Cambiar ventana de tiempo
  const handleTimeWindowChange = (newWindow: number) => {
    setTimeWindow(newWindow)
    // Si no estamos en modo zoom de evento, actualizar la ventana original
    if (!selectedEvent) {
      setOriginalTimeWindow(newWindow)
    }
    loadECGWindow(currentTime, newWindow)
  }

  const filteredEvents = events.filter(event => 
    eventFilter === "all" || event.type === eventFilter
  )

  const visibleEvents = filteredEvents.filter(
    event => event.time >= currentTime && event.time <= currentTime + timeWindow
  )

  const handleEventClick = (eventTime: number) => {
    // Guardar la ventana de tiempo original si no está ya guardada
    if (timeWindow > 2) {
      setOriginalTimeWindow(timeWindow)
    }
    
    // Hacer zoom a 1 segundo centrado en el evento
    const eventStart = Math.max(0, eventTime - 0.5) // 0.5 segundos antes del evento
    const zoomWindow = 1 // 1 segundo total
    
    setTimeWindow(zoomWindow)
    loadECGWindow(eventStart, zoomWindow)
    setSelectedEvent(eventTime)
  }

  // Función para volver a la vista normal
  const resetZoom = () => {
    setTimeWindow(originalTimeWindow)
    setSelectedEvent(null)
    loadECGWindow(currentTime, originalTimeWindow)
  }

  // Generar colores dinámicos para las derivaciones
  const getLeadColor = (lead: string, index: number): string => {
    const colors = ['#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#9333ea', '#c2410c']
    return colors[index % colors.length]
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando datos...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center text-red-600">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
          <p className="text-lg font-semibold">Error al cargar los datos</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (!patientData || !statistics) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Heart className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Registro {patientData?.recordId || recordId}
                </h1>
                <p className="text-sm text-gray-600">
                  {patientData?.description || 'Sin descripción disponible'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Selector de Pacientes */}
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-gray-500" />
                <Select value={recordId} onValueChange={handlePatientChange}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Seleccionar paciente" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((patient) => (
                      <SelectItem key={patient.recordId} value={patient.recordId}>
                        Registro {patient.recordId} ({patient.availableLeads.join(', ')})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-right">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">
                    {ecgData.actualPoints} puntos | Decimación: {ecgData.decimation}x
                  </Badge>
                  <Badge variant="secondary">
                    {currentTime.toFixed(1)}s - {(currentTime + timeWindow).toFixed(1)}s
                  </Badge>
                  <Badge variant="outline">
                    Derivaciones: {ecgData.leads?.join(', ') || 'N/A'}
                  </Badge>
                  {selectedEvent && (
                    <Badge variant="destructive">
                      🔍 Zoom en Evento ({selectedEvent.toFixed(2)}s)
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Navigation Controls */}
      <Card className="mb-4">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between space-x-4">
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={goToStart}>
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToPrevious}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              {selectedEvent && (
                <Button variant="outline" size="sm" onClick={resetZoom}>
                  <ZoomOut className="h-4 w-4 mr-1" />
                  Vista Normal
                </Button>
              )}
            </div>
            
            <div className="flex-1 px-4">
              <input
                type="range"
                min="0"
                max={maxTime - timeWindow}
                value={currentTime}
                onChange={(e) => goToTime(parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="flex items-center space-x-4">
              <Select value={timeWindow.toString()} onValueChange={(value) => handleTimeWindowChange(parseInt(value))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 segundo</SelectItem>
                  <SelectItem value="5">5 segundos</SelectItem>
                  <SelectItem value="10">10 segundos</SelectItem>
                  <SelectItem value="30">30 segundos</SelectItem>
                  <SelectItem value="60">1 minuto</SelectItem>
                  <SelectItem value="300">5 minutos</SelectItem>
                  <SelectItem value="600">10 minutos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-12 gap-4">
        {/* Events Panel */}
        <Card className="col-span-3">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Eventos Detectados
              </CardTitle>
              <Filter className="h-4 w-4 text-gray-500" />
            </div>
            <Select value={eventFilter} onValueChange={setEventFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filtrar eventos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los eventos</SelectItem>
                <SelectItem value="normal">Normal (N)</SelectItem>
                <SelectItem value="pvc">PVC (V)</SelectItem>
                <SelectItem value="apb">APB (A)</SelectItem>
                <SelectItem value="lbbb">LBBB (L)</SelectItem>
                <SelectItem value="rbbb">RBBB (R)</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-80">
              <div className="space-y-2">
                {visibleEvents.map((event, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedEvent === event.time
                        ? "bg-blue-50 border-blue-200"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => handleEventClick(event.time)}
                  >
                    <div className="flex items-center justify-between">
                      <Badge style={{ backgroundColor: event.color, color: 'white' }}>
                        {event.type.toUpperCase()}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {event.time.toFixed(2)}s
                      </span>
                    </div>
                    <p className="text-sm mt-1">{event.description}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* ECG Chart */}
        <Card className="col-span-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                Señal ECG en Tiempo Real
                {selectedEvent && (
                  <span className="text-sm font-normal text-orange-600 ml-2">
                    (Zoom en evento a {selectedEvent.toFixed(2)}s)
                  </span>
                )}
              </CardTitle>
              {selectedEvent && (
                <Button variant="ghost" size="sm" onClick={resetZoom}>
                  <ZoomOut className="h-4 w-4 mr-1" />
                  Salir del Zoom
                </Button>
              )}
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>Frecuencia de muestreo: {ecgData.sampleRate || 360} Hz</span>
              <span>Puntos mostrados: {ecgData.actualPoints}</span>
              {ecgData.decimation > 1 && (
                <Badge variant="outline">Decimación {ecgData.decimation}x</Badge>
              )}
              <span>Derivaciones: {ecgData.leads?.length || 0}</span>
              {selectedEvent && (
                <Badge variant="outline" className="text-orange-600">
                  Ventana: {timeWindow}s (Original: {originalTimeWindow}s)
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ecgData.data || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="time" 
                    type="number"
                    scale="linear"
                    domain={['dataMin', 'dataMax']}
                    tickFormatter={(value) => `${value.toFixed(1)}s`}
                  />
                  <YAxis domain={[-3, 3]} />
                  {/* Renderizar dinámicamente todas las derivaciones disponibles */}
                  {ecgData.leads?.map((lead: string, index: number) => (
                    <Line
                      key={lead}
                      type="monotone"
                      dataKey={`values.${lead}`}
                      stroke={getLeadColor(lead, index)}
                      strokeWidth={1}
                      dot={false}
                      name={lead}
                    />
                  ))}
                  {visibleEvents.map((event, index) => (
                    <ReferenceLine
                      key={index}
                      x={event.time}
                      stroke={event.color}
                      strokeDasharray="5 5"
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            {/* Leyenda de derivaciones */}
            {ecgData.leads?.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {ecgData.leads.map((lead: string, index: number) => (
                  <Badge key={lead} variant="outline" className="flex items-center space-x-1">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getLeadColor(lead, index) }}
                    />
                    <span>{lead}</span>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Statistics Panel */}
        <Card className="col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Estadísticas de Latidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{statistics.totalBeats}</p>
                <p className="text-sm text-gray-600">Total de latidos</p>
              </div>
              <Separator />
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {statistics.beatTypes.map((beatType, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: beatType.color }}
                        />
                        <span className="text-sm">{beatType.description}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{beatType.count}</p>
                        <p className="text-xs text-gray-500">
                          {((beatType.count / statistics.totalBeats) * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
