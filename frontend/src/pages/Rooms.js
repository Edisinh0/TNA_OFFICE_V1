import { useState, useEffect, useMemo } from 'react';
import apiClient from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Users, Calendar as CalendarIcon, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/es';
import 'react-big-calendar/lib/css/react-big-calendar.css';

moment.locale('es');
const localizer = momentLocalizer(moment);

export const Rooms = () => {
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [bookingForm, setBookingForm] = useState({
    client_name: '',
    client_email: '',
    client_phone: '',
    start_time: '',
    end_time: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [roomsRes, bookingsRes] = await Promise.all([
        apiClient.get('/rooms'),
        apiClient.get('/bookings?resource_type=room')
      ]);
      setRooms(roomsRes.data);
      setBookings(bookingsRes.data);
    } catch (error) {
      toast.error('Error al cargar datos');
    }
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/bookings', {
        ...bookingForm,
        resource_type: 'room',
        resource_id: selectedRoom.id,
        resource_name: selectedRoom.name
      });
      toast.success('Reserva creada exitosamente');
      setShowBookingModal(false);
      setBookingForm({
        client_name: '',
        client_email: '',
        client_phone: '',
        start_time: '',
        end_time: '',
        notes: ''
      });
      loadData();
    } catch (error) {
      toast.error('Error al crear reserva');
    }
  };

  const updateBookingStatus = async (bookingId, status) => {
    try {
      await apiClient.put(`/bookings/${bookingId}?status=${status}`);
      toast.success('Estado actualizado');
      loadData();
    } catch (error) {
      toast.error('Error al actualizar estado');
    }
  };

  const getRoomBookings = (roomId) => {
    return bookings.filter(b => b.resource_id === roomId);
  };

  const calendarEvents = useMemo(() => {
    if (!selectedRoom) return [];
    
    return getRoomBookings(selectedRoom.id).map(booking => ({
      id: booking.id,
      title: `${booking.client_name} - ${booking.status}`,
      start: new Date(booking.start_time),
      end: new Date(booking.end_time),
      resource: booking,
      style: {
        backgroundColor: booking.status === 'confirmed' ? '#10b981' : 
                        booking.status === 'pending' ? '#f59e0b' : '#ef4444'
      }
    }));
  }, [selectedRoom, bookings]);

  const eventStyleGetter = (event) => {
    return {
      style: event.style
    };
  };

  return (
    <div className="space-y-6" data-testid="rooms-page">
      <div>
        <h1 className="font-secondary text-4xl md:text-5xl font-black uppercase text-black tracking-tight">
          GESTIÓN DE SALAS
        </h1>
        <div className="h-1 w-32 tna-gradient mt-4"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {rooms.map((room) => (
          <Card key={room.id} className="bg-white border-gray-200 rounded-sm">
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="font-secondary uppercase text-black flex items-center justify-between">
                {room.name}
                <span className="text-sm text-gray-600 font-primary normal-case flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {room.capacity} personas
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-gray-600 font-primary text-sm mb-4">{room.description}</p>
              
              <div className="space-y-2 mb-4">
                <div className="text-sm font-secondary uppercase text-black">Próximas reservas:</div>
                {getRoomBookings(room.id).slice(0, 3).map((booking) => (
                  <div key={booking.id} className="bg-gray-50 p-3 rounded-sm border border-gray-200 flex items-center justify-between">
                    <div>
                      <div className="text-black font-primary text-sm">{booking.client_name}</div>
                      <div className="text-gray-500 text-xs font-primary">
                        {new Date(booking.start_time).toLocaleString('es-CL')}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {booking.status === 'pending' && (
                        <>
                          <Button
                            data-testid={`confirm-booking-${booking.id}`}
                            size="sm"
                            onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                            className="bg-green-600 hover:bg-green-700 text-white rounded-sm"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                            className="bg-red-600 hover:bg-red-700 text-white rounded-sm"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {booking.status === 'confirmed' && (
                        <span className="text-xs text-green-600 font-primary">Confirmada</span>
                      )}
                      {booking.status === 'cancelled' && (
                        <span className="text-xs text-red-600 font-primary">Cancelada</span>
                      )}
                    </div>
                  </div>
                ))}
                {getRoomBookings(room.id).length === 0 && (
                  <p className="text-gray-400 text-xs font-primary">Sin reservas</p>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  data-testid={`view-calendar-${room.name}`}
                  onClick={() => {
                    setSelectedRoom(room);
                    setShowCalendarModal(true);
                  }}
                  className="flex-1 bg-white border border-gray-300 text-black hover:bg-gray-50 rounded-sm uppercase tracking-wide font-secondary"
                >
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  VER CALENDARIO
                </Button>
                <Button
                  data-testid={`add-booking-${room.name}`}
                  onClick={() => {
                    setSelectedRoom(room);
                    setShowBookingModal(true);
                  }}
                  className="flex-1 bg-black text-white hover:bg-gray-800 rounded-sm uppercase tracking-wide font-secondary"
                >
                  NUEVA RESERVA
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Calendar Modal */}
      <Dialog open={showCalendarModal} onOpenChange={setShowCalendarModal}>
        <DialogContent className="bg-white border-gray-200 text-black max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="font-secondary uppercase text-xl">CALENDARIO - {selectedRoom?.name}</DialogTitle>
            <p className="text-gray-600 font-primary text-sm">Visualización de disponibilidad y reservas</p>
          </DialogHeader>
          <div className="mt-4" style={{ height: '600px' }}>
            <Calendar
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              eventStyleGetter={eventStyleGetter}
              views={['month', 'week', 'day']}
              defaultView="week"
              min={new Date(2024, 0, 1, 8, 0, 0)}
              max={new Date(2024, 0, 1, 19, 0, 0)}
              messages={{
                next: "Siguiente",
                previous: "Anterior",
                today: "Hoy",
                month: "Mes",
                week: "Semana",
                day: "Día",
                agenda: "Agenda",
                date: "Fecha",
                time: "Hora",
                event: "Evento",
                noEventsInRange: "Sin reservas en este rango"
              }}
              onSelectSlot={(slotInfo) => {
                setBookingForm({
                  ...bookingForm,
                  start_time: moment(slotInfo.start).format('YYYY-MM-DDTHH:mm'),
                  end_time: moment(slotInfo.end).format('YYYY-MM-DDTHH:mm')
                });
                setShowCalendarModal(false);
                setShowBookingModal(true);
              }}
              selectable
            />
          </div>
          <div className="mt-4 flex gap-4 text-sm font-primary">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-600 rounded"></div>
              <span>Confirmada</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-600 rounded"></div>
              <span>Pendiente</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-600 rounded"></div>
              <span>Cancelada</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Booking Modal */}
      <Dialog open={showBookingModal} onOpenChange={setShowBookingModal}>
        <DialogContent className="bg-white border-gray-200 text-black">
          <DialogHeader>
            <DialogTitle className="font-secondary uppercase text-xl">NUEVA RESERVA</DialogTitle>
            <p className="text-gray-600 font-primary text-sm">{selectedRoom?.name}</p>
          </DialogHeader>
          <form onSubmit={handleBookingSubmit} className="space-y-4 mt-4">
            <div>
              <Label className="text-black font-primary">Cliente</Label>
              <Input
                data-testid="booking-client-name"
                value={bookingForm.client_name}
                onChange={(e) => setBookingForm({ ...bookingForm, client_name: e.target.value })}
                className="bg-white border-gray-300 text-black"
                required
              />
            </div>
            <div>
              <Label className="text-black font-primary">Email</Label>
              <Input
                type="email"
                value={bookingForm.client_email}
                onChange={(e) => setBookingForm({ ...bookingForm, client_email: e.target.value })}
                className="bg-white border-gray-300 text-black"
                required
              />
            </div>
            <div>
              <Label className="text-black font-primary">Teléfono</Label>
              <Input
                value={bookingForm.client_phone}
                onChange={(e) => setBookingForm({ ...bookingForm, client_phone: e.target.value })}
                className="bg-white border-gray-300 text-black"
              />
            </div>
            <div>
              <Label className="text-black font-primary">Inicio</Label>
              <Input
                data-testid="booking-start-time"
                type="datetime-local"
                value={bookingForm.start_time}
                onChange={(e) => setBookingForm({ ...bookingForm, start_time: e.target.value })}
                className="bg-white border-gray-300 text-black"
                required
              />
            </div>
            <div>
              <Label className="text-black font-primary">Término</Label>
              <Input
                type="datetime-local"
                value={bookingForm.end_time}
                onChange={(e) => setBookingForm({ ...bookingForm, end_time: e.target.value })}
                className="bg-white border-gray-300 text-black"
                required
              />
            </div>
            <Button
              data-testid="submit-booking"
              type="submit"
              className="w-full bg-black text-white hover:bg-gray-800 rounded-sm font-bold uppercase tracking-wide font-secondary"
            >
              CREAR RESERVA
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};