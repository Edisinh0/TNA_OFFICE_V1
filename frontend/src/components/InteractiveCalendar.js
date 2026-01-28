import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Clock, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from './ui/button';

const InteractiveCalendar = ({ onTimeSelect, selectedDate, setSelectedDate, bookings = [] }) => {
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  
  // Horarios de 8 AM a 8 PM (cada 30 minutos)
  const timeSlots = [];
  for (let hour = 8; hour <= 20; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      if (hour === 20 && minute > 0) break; // Termina a las 8 PM
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeSlots.push(time);
    }
  }

  // Función para generar los días de la semana
  const generateWeekDays = (date) => {
    const start = new Date(date);
    const dayOfWeek = start.getDay();
    const monday = new Date(start);
    monday.setDate(start.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      days.push(day);
    }
    return days;
  };

  // Días de la semana para mostrar (inicializado con los días correctos)
  const [weekDays, setWeekDays] = useState(() => generateWeekDays(selectedDate));

  useEffect(() => {
    setWeekDays(generateWeekDays(selectedDate));
  }, [selectedDate]);

  const changeWeek = (direction) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction * 7));
    setSelectedDate(newDate);
  };

  const formatDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
  };

  const formatDayName = (date) => {
    return date.toLocaleDateString('es-CL', { weekday: 'short' }).toUpperCase();
  };

  const isSlotBooked = (day, time) => {
    const dateStr = day.toISOString().split('T')[0];
    return bookings.some(booking => {
      const bookingDate = booking.start_time.split('T')[0];
      const bookingStartTime = booking.start_time.split('T')[1].substring(0, 5);
      const bookingEndTime = booking.end_time.split('T')[1].substring(0, 5);
      return dateStr === bookingDate && time >= bookingStartTime && time < bookingEndTime;
    });
  };

  const getSlotId = (day, time) => {
    return `${day.toISOString().split('T')[0]}_${time}`;
  };

  const handleMouseDown = (day, time) => {
    if (isSlotBooked(day, time)) return;
    
    setIsDragging(true);
    const slotId = getSlotId(day, time);
    setDragStart({ day, time, slotId });
    setSelectedSlots([slotId]);
  };

  const handleMouseEnter = (day, time) => {
    if (!isDragging || !dragStart) return;
    if (isSlotBooked(day, time)) return;

    // Solo permitir selección en el mismo día
    if (day.toISOString().split('T')[0] !== dragStart.day.toISOString().split('T')[0]) return;

    const currentSlotId = getSlotId(day, time);
    const startIndex = timeSlots.indexOf(dragStart.time);
    const currentIndex = timeSlots.indexOf(time);

    const minIndex = Math.min(startIndex, currentIndex);
    const maxIndex = Math.max(startIndex, currentIndex);

    const newSelection = [];
    for (let i = minIndex; i <= maxIndex; i++) {
      const slotId = getSlotId(day, timeSlots[i]);
      if (!isSlotBooked(day, timeSlots[i])) {
        newSelection.push(slotId);
      }
    }

    setSelectedSlots(newSelection);
  };

  const handleMouseUp = () => {
    if (isDragging && selectedSlots.length > 0) {
      // Calcular tiempo de inicio y fin
      const firstSlot = selectedSlots[0].split('_');
      const lastSlot = selectedSlots[selectedSlots.length - 1].split('_');
      
      const startTime = firstSlot[1];
      const lastTime = lastSlot[1];
      
      // Calcular el end_time sumando 30 minutos al último slot
      const [hour, minute] = lastTime.split(':').map(Number);
      let endHour = hour;
      let endMinute = minute + 30;
      if (endMinute >= 60) {
        endHour += 1;
        endMinute -= 60;
      }
      const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;

      onTimeSelect({
        date: firstSlot[0],
        startTime,
        endTime
      });
    }
    
    setIsDragging(false);
    setDragStart(null);
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      {/* Header con navegación de semana */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => changeWeek(-1)}
          className="border-gray-300"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-orange-500" />
          <span className="font-semibold text-gray-900">
            {formatDate(weekDays[0])} - {formatDate(weekDays[6])}
          </span>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => changeWeek(1)}
          className="border-gray-300"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Leyenda */}
      <div className="flex items-center gap-4 mb-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
          <span className="text-gray-600">Disponible</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-orange-500 rounded"></div>
          <span className="text-gray-600">Seleccionado</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-gray-300 rounded"></div>
          <span className="text-gray-600">Ocupado</span>
        </div>
      </div>

      {/* Calendario de horarios */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Header de días */}
          <div className="grid grid-cols-8 gap-1 mb-2">
            <div className="text-xs font-semibold text-gray-500 p-2">Hora</div>
            {weekDays.map((day, idx) => (
              <div
                key={idx}
                className={`text-center p-2 rounded ${
                  isToday(day) ? 'bg-orange-100 border border-orange-300' : 'bg-gray-50'
                }`}
              >
                <div className="text-xs font-semibold text-gray-900">
                  {formatDayName(day)}
                </div>
                <div className="text-xs text-gray-600">
                  {day.getDate()}
                </div>
              </div>
            ))}
          </div>

          {/* Grid de horarios */}
          <div className="space-y-1">
            {timeSlots.map((time, timeIdx) => (
              <div key={time} className="grid grid-cols-8 gap-1">
                {/* Columna de hora */}
                <div className="text-xs text-gray-600 p-2 flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {time}
                </div>

                {/* Columnas de días */}
                {weekDays.map((day, dayIdx) => {
                  const slotId = getSlotId(day, time);
                  const isBooked = isSlotBooked(day, time);
                  const isSelected = selectedSlots.includes(slotId);

                  return (
                    <div
                      key={`${dayIdx}-${timeIdx}`}
                      className={`
                        h-10 rounded cursor-pointer transition-all
                        ${isBooked ? 'bg-gray-300 cursor-not-allowed' : ''}
                        ${isSelected ? 'bg-orange-500 shadow-md' : ''}
                        ${!isBooked && !isSelected ? 'bg-green-50 border border-green-200 hover:bg-green-100' : ''}
                      `}
                      onMouseDown={() => handleMouseDown(day, time)}
                      onMouseEnter={() => handleMouseEnter(day, time)}
                      onMouseUp={handleMouseUp}
                      style={{ userSelect: 'none' }}
                    ></div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Indicador de selección */}
      {selectedSlots.length > 0 && (
        <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-orange-900">
            <Clock className="w-4 h-4" />
            <span className="font-semibold">
              Horario seleccionado: {selectedSlots[0].split('_')[1]} - {
                (() => {
                  const lastSlot = selectedSlots[selectedSlots.length - 1].split('_')[1];
                  const [hour, minute] = lastSlot.split(':').map(Number);
                  let endHour = hour;
                  let endMinute = minute + 30;
                  if (endMinute >= 60) {
                    endHour += 1;
                    endMinute -= 60;
                  }
                  return `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
                })()
              }
            </span>
            <span className="text-xs text-gray-600">
              ({selectedSlots.length * 30} minutos)
            </span>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500 mt-4">
        💡 Arrastra el mouse sobre los horarios disponibles para seleccionar el rango deseado
      </p>
    </div>
  );
};

export default InteractiveCalendar;
