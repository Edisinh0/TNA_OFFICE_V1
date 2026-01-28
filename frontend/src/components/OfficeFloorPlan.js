/**
 * TNA Office - Componente de Plano Interactivo
 *
 * Muestra un plano SVG interactivo del piso 17 con las oficinas.
 * Permite visualizar estado, margenes y editar posiciones.
 * Utiliza apiClient centralizado para todas las peticiones.
 */

import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Building2, Edit3, Save, X, Move, Maximize2 } from 'lucide-react';
import { Button } from './ui/button';
import apiClient from '../utils/api';

export const OfficeFloorPlan = ({ offices, filteredOffices, selectedOfficeIds = [], onOfficeSelect }) => {
  const [hoveredOffice, setHoveredOffice] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [editMode, setEditMode] = useState(false);
  const [selectedOffice, setSelectedOffice] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [customCoordinates, setCustomCoordinates] = useState({});

  // Load custom coordinates from database on mount
  useEffect(() => {
    const loadCoordinates = async () => {
      try {
        const response = await apiClient.get('/floor-plan/coordinates');
        if (response.data?.coordinates && Object.keys(response.data.coordinates).length > 0) {
          setCustomCoordinates(response.data.coordinates);
        }
      } catch (e) {
        // Si es 401, el interceptor ya maneja la redireccion
        if (e.response?.status !== 401) {
          console.error('Error loading saved coordinates:', e);
        }
      }
    };

    loadCoordinates();
  }, []);

  // Save coordinates to database
  const saveCoordinates = async () => {
    try {
      console.log('Guardando coordenadas...', Object.keys(customCoordinates).length, 'oficinas');

      const response = await apiClient.post('/floor-plan/coordinates', {
        coordinates: customCoordinates
      });

      if (response.status === 200) {
        alert('Coordenadas guardadas exitosamente en la base de datos!');
        console.log('Guardado exitoso:', response.data);
      }
    } catch (e) {
      console.error('Error saving coordinates:', e);

      if (e.response?.status === 401) {
        alert('Tu sesion ha expirado. Por favor, vuelve a iniciar sesion.');
        // El interceptor ya maneja la redireccion
      } else if (e.response?.status === 403) {
        alert('No tienes permisos de administrador para guardar coordenadas.');
      } else {
        alert('Error al guardar: ' + (e.response?.data?.detail || 'Error desconocido'));
      }
    }
  };

  // Reset to default coordinates
  const resetCoordinates = async () => {
    if (window.confirm('Restaurar coordenadas por defecto? Se perderan los cambios guardados de la base de datos.')) {
      try {
        // Save empty coordinates to database
        await apiClient.post('/floor-plan/coordinates', { coordinates: {} });

        setCustomCoordinates({});
        setSelectedOffice(null);
        alert('Coordenadas restauradas a valores por defecto');
      } catch (e) {
        console.error('Error resetting coordinates:', e);
        setCustomCoordinates({});
        setSelectedOffice(null);
      }
    }
  };

  // Export coordinates to console for development
  const exportCoordinates = () => {
    const coords = { ...defaultOfficeCoordinates, ...customCoordinates };
    console.log('Current coordinates:', JSON.stringify(coords, null, 2));
    alert('Coordenadas exportadas a la consola del navegador (F12)');
  };

  // Coordenadas ajustadas manualmente basadas en el plano (viewBox 2500x1000)
  // Mapeo preciso de cada oficina visible en el plano arquitectonico
  const defaultOfficeCoordinates = {
    // Lado izquierdo - Fila superior
    '1715': { x: 80, y: 355, width: 190, height: 170 },
    '1716': { x: 280, y: 355, width: 150, height: 170 },
    '1717': { x: 440, y: 355, width: 155, height: 170 },
    '1718': { x: 605, y: 355, width: 155, height: 170 },
    '1719': { x: 770, y: 355, width: 155, height: 170 },

    // Lado izquierdo - Fila media
    '1712': { x: 85, y: 560, width: 180, height: 195 },
    '1713': { x: 275, y: 560, width: 205, height: 195 },
    '1714': { x: 490, y: 560, width: 220, height: 195 },
    '1722': { x: 720, y: 560, width: 165, height: 195 },
    '1724': { x: 895, y: 560, width: 165, height: 195 },
    '1720': { x: 1070, y: 560, width: 165, height: 195 },
    '1732': { x: 1245, y: 560, width: 180, height: 195 },

    // Lado izquierdo - Fila inferior
    '1711': { x: 105, y: 775, width: 155, height: 155 },
    '1710': { x: 270, y: 775, width: 300, height: 155 },
    '1709': { x: 580, y: 775, width: 285, height: 155 },
    '1705': { x: 875, y: 775, width: 140, height: 155 },
    '1707': { x: 1025, y: 775, width: 140, height: 155 },
    '1703': { x: 1175, y: 775, width: 140, height: 155 },
    '1702': { x: 1325, y: 775, width: 135, height: 155 },
    '1701': { x: 1470, y: 775, width: 130, height: 155 },

    // Centro - Fila media
    '1737': { x: 935, y: 355, width: 155, height: 170 },
    '1721': { x: 1100, y: 355, width: 155, height: 170 },
    '1723': { x: 1265, y: 355, width: 155, height: 170 },
    '1725': { x: 1430, y: 355, width: 155, height: 170 },
    '1726': { x: 1595, y: 355, width: 155, height: 170 },
    '1727': { x: 1760, y: 355, width: 155, height: 170 },

    // Centro superior
    '1728': { x: 800, y: 180, width: 185, height: 145 },
    '1729': { x: 995, y: 180, width: 185, height: 145 },
    '1731': { x: 1190, y: 180, width: 180, height: 145 },
    '1730': { x: 1380, y: 180, width: 180, height: 145 },
    '1736': { x: 1570, y: 180, width: 175, height: 145 },
    '1735': { x: 1755, y: 180, width: 175, height: 145 },
    '1734': { x: 1940, y: 180, width: 175, height: 145 },
    '1733': { x: 2125, y: 180, width: 175, height: 145 },

    // Lado derecho
    '1738': { x: 475, y: 610, width: 125, height: 145 },
    '1708': { x: 1630, y: 610, width: 140, height: 145 },
    '1706': { x: 1780, y: 610, width: 140, height: 145 },
    '1704': { x: 1930, y: 610, width: 140, height: 145 },

    // Oficina 1780 (si existe en DB)
    '1780': { x: 610, y: 610, width: 105, height: 145 },
  };

  // Merge default coordinates with custom coordinates
  const officeCoordinates = { ...defaultOfficeCoordinates, ...customCoordinates };

  // Check if filters are active (if filteredOffices is different from offices)
  const hasActiveFilters = filteredOffices && filteredOffices.length !== offices.length;

  // Create set of filtered office numbers for quick lookup
  const filteredOfficeNumbers = new Set(
    filteredOffices ? filteredOffices.map(o => o.office_number) : []
  );

  const formatUF = (amount) => {
    return new Intl.NumberFormat('es-CL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount) + ' UF';
  };

  const getOfficeColor = (office) => {
    if (!office) return 'rgba(229, 231, 235, 0.3)';

    if (office.status === 'available') {
      return 'rgba(147, 197, 253, 0.6)'; // Azul translucido para disponibles
    }

    if (office.margin_percentage > 0) {
      return 'rgba(134, 239, 172, 0.6)'; // Verde para margen positivo
    } else if (office.margin_percentage < 0) {
      return 'rgba(252, 165, 165, 0.6)'; // Rojo para margen negativo
    }

    return 'rgba(203, 213, 225, 0.5)';
  };

  const handleOfficeHover = (officeNum, event) => {
    const office = offices.find(o => o.office_number === officeNum);
    setHoveredOffice(office);

    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 10
    });
  };

  const handleOfficeClick = (officeNum, event) => {
    if (editMode) {
      event.stopPropagation();
      setSelectedOffice(officeNum);
      return;
    }

    const office = offices.find(o => o.office_number === officeNum);
    if (office && onOfficeSelect) {
      onOfficeSelect(office);
    }
  };

  // Handle mouse down for dragging
  const handleMouseDown = (officeNum, event, isResize = false) => {
    if (!editMode) return;

    event.stopPropagation();
    const svg = event.currentTarget.ownerSVGElement;
    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());

    setSelectedOffice(officeNum);
    if (isResize) {
      setIsResizing(true);
    } else {
      setIsDragging(true);
    }
    setDragStart({ x: svgP.x, y: svgP.y });
  };

  // Handle mouse move for dragging/resizing
  const handleMouseMove = (event) => {
    if (!editMode || (!isDragging && !isResizing) || !selectedOffice) return;

    const svg = event.currentTarget;
    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());

    const currentCoords = officeCoordinates[selectedOffice];
    if (!currentCoords) return;

    const dx = svgP.x - dragStart.x;
    const dy = svgP.y - dragStart.y;

    if (isDragging) {
      // Update position
      setCustomCoordinates(prev => ({
        ...prev,
        [selectedOffice]: {
          ...currentCoords,
          x: Math.max(0, Math.min(2500 - currentCoords.width, currentCoords.x + dx)),
          y: Math.max(0, Math.min(1000 - currentCoords.height, currentCoords.y + dy))
        }
      }));
    } else if (isResizing) {
      // Update size
      setCustomCoordinates(prev => ({
        ...prev,
        [selectedOffice]: {
          ...currentCoords,
          width: Math.max(20, currentCoords.width + dx),
          height: Math.max(20, currentCoords.height + dy)
        }
      }));
    }

    setDragStart({ x: svgP.x, y: svgP.y });
  };

  // Handle mouse up
  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  return (
    <Card className="bg-white border-gray-200 rounded-sm overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-gray-700" />
            <h3 className="font-secondary uppercase text-black text-sm">Plano Interactivo - Piso 17</h3>
          </div>

          <div className="flex items-center gap-2">
            {!editMode && (
              <div className="flex gap-4 text-xs font-primary">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-300 rounded-sm border border-gray-400" style={{ opacity: 0.6 }}></div>
                  <span>Margen +</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-300 rounded-sm border border-gray-400" style={{ opacity: 0.6 }}></div>
                  <span>Margen -</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-blue-300 rounded-sm border border-gray-400" style={{ opacity: 0.6 }}></div>
                  <span>Disponible</span>
                </div>
              </div>
            )}

            <Button
              onClick={() => {
                setEditMode(!editMode);
                setSelectedOffice(null);
              }}
              size="sm"
              variant={editMode ? "default" : "outline"}
              className={`font-secondary text-xs uppercase ${
                editMode
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              } rounded-sm`}
            >
              {editMode ? (
                <>
                  <X className="w-3 h-3 mr-1" />
                  Salir de Edicion
                </>
              ) : (
                <>
                  <Edit3 className="w-3 h-3 mr-1" />
                  Modo Edicion
                </>
              )}
            </Button>
          </div>
        </div>

        {editMode && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-sm">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="text-xs font-primary text-blue-900">
                <p className="font-bold mb-1">Modo Edicion Activo</p>
                <ul className="space-y-1 text-blue-800">
                  <li>- Click en un area para seleccionarla</li>
                  <li>- Arrastra el area para moverla</li>
                  <li>- Arrastra la esquina inferior derecha para redimensionar</li>
                </ul>
                {selectedOffice && (
                  <p className="mt-2 font-bold text-blue-900">
                    Editando: Oficina {selectedOffice}
                    {officeCoordinates[selectedOffice] && (
                      <span className="font-normal ml-2">
                        (x: {Math.round(officeCoordinates[selectedOffice].x)},
                        y: {Math.round(officeCoordinates[selectedOffice].y)},
                        w: {Math.round(officeCoordinates[selectedOffice].width)},
                        h: {Math.round(officeCoordinates[selectedOffice].height)})
                      </span>
                    )}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={saveCoordinates}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white rounded-sm font-secondary text-xs uppercase"
                >
                  <Save className="w-3 h-3 mr-1" />
                  Guardar
                </Button>
                <Button
                  onClick={exportCoordinates}
                  size="sm"
                  variant="outline"
                  className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50 rounded-sm font-secondary text-xs uppercase"
                >
                  Exportar
                </Button>
                <Button
                  onClick={resetCoordinates}
                  size="sm"
                  variant="outline"
                  className="bg-white border-red-300 text-red-700 hover:bg-red-50 rounded-sm font-secondary text-xs uppercase"
                >
                  Reset
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="relative" style={{ backgroundColor: '#fafafa' }}>
        <div className="relative w-full" style={{ paddingBottom: '40%' }}>
          <img
            src="https://customer-assets.emergentagent.com/job_373fee87-468b-4940-ac57-79ceed35c83a/artifacts/dg3ddtli_Captura%20de%20pantalla%202025-12-10%20a%20la%28s%29%2019.03.21.png"
            alt="Plano Piso 17"
            className="absolute inset-0 w-full h-full object-contain"
            style={{ opacity: 0.95 }}
          />

          <svg
            viewBox="0 0 2500 1000"
            className="absolute inset-0 w-full h-full"
            style={{ pointerEvents: 'none' }}
            preserveAspectRatio="xMidYMid meet"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {Object.entries(officeCoordinates).map(([officeNum, coords]) => {
              const office = offices.find(o => o.office_number === officeNum);
              const color = getOfficeColor(office);
              const isHovered = hoveredOffice?.office_number === officeNum;
              const isSelected = selectedOffice === officeNum && editMode;

              // Determine visual style based on selection state
              const isOfficeInSelection = office && selectedOfficeIds.includes(office.id);
              const strokeColor = isOfficeInSelection ? '#f97316' : isSelected ? '#2563eb' : isHovered ? '#000' : 'rgba(107, 114, 128, 0.4)';
              const strokeWidth = isOfficeInSelection ? '6' : isSelected ? '6' : isHovered ? '4' : '2';

              // Check if this office should be visible based on filters
              const isVisible = !hasActiveFilters || filteredOfficeNumbers.has(officeNum) || editMode;

              // Check if this office is selected in the table
              const isOfficeSelected = office && selectedOfficeIds.includes(office.id);

              // If not visible and filters are active, don't render
              if (!isVisible && !editMode) {
                return null;
              }

              // Calculate opacity based on both filters and selection
              let opacity = 1;
              if (!editMode) {
                if (selectedOfficeIds.length > 0 && !isOfficeSelected) {
                  // If there are selections but this office isn't selected, dim it
                  opacity = 0.15;
                } else if (!isVisible) {
                  // If filtered out, also dim it
                  opacity = 0.15;
                }
              }

              return (
                <g key={officeNum} style={{ opacity }}>
                  <rect
                    x={coords.x}
                    y={coords.y}
                    width={coords.width}
                    height={coords.height}
                    fill={color}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    className={editMode ? "cursor-move" : "cursor-pointer"}
                    style={{
                      pointerEvents: 'all',
                      filter: isOfficeInSelection ? 'brightness(1.2) drop-shadow(0 0 12px rgba(249, 115, 22, 0.8))' : isSelected ? 'brightness(1.1) drop-shadow(0 0 12px rgba(37, 99, 235, 0.8))' : isHovered ? 'brightness(1.2) drop-shadow(0 4px 8px rgba(0,0,0,0.4))' : 'none',
                      transition: editMode ? 'none' : 'all 0.15s'
                    }}
                    onMouseEnter={(e) => !editMode && handleOfficeHover(officeNum, e)}
                    onMouseLeave={() => !editMode && setHoveredOffice(null)}
                    onClick={(e) => handleOfficeClick(officeNum, e)}
                    onMouseDown={(e) => handleMouseDown(officeNum, e, false)}
                  />

                  {/* Resize handle in edit mode */}
                  {isSelected && editMode && (
                    <>
                      {/* Corner resize handle */}
                      <rect
                        x={coords.x + coords.width - 15}
                        y={coords.y + coords.height - 15}
                        width="15"
                        height="15"
                        fill="#2563eb"
                        stroke="#fff"
                        strokeWidth="2"
                        className="cursor-nwse-resize"
                        style={{ pointerEvents: 'all' }}
                        onMouseDown={(e) => handleMouseDown(officeNum, e, true)}
                      />
                      <Maximize2
                        x={coords.x + coords.width - 12}
                        y={coords.y + coords.height - 12}
                        width="9"
                        height="9"
                        stroke="#fff"
                        strokeWidth="2"
                        className="pointer-events-none"
                      />

                      {/* Move icon in center */}
                      <Move
                        x={coords.x + coords.width/2 - 8}
                        y={coords.y + coords.height/2 - 8}
                        width="16"
                        height="16"
                        stroke="#2563eb"
                        fill="#fff"
                        strokeWidth="2"
                        className="pointer-events-none"
                        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
                      />
                    </>
                  )}

                  {/* Office number - always visible */}
                  {!editMode && (
                    <>
                      <text
                        x={coords.x + coords.width/2}
                        y={coords.y + coords.height/2}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#1f2937"
                        fontSize={isHovered ? "28" : "24"}
                        fontWeight="900"
                        fontFamily="system-ui, -apple-system, sans-serif"
                        className="pointer-events-none select-none"
                        style={{
                          textShadow: '0 0 6px white, 0 0 6px white, 0 0 6px white, 0 0 8px white, 0 1px 2px rgba(0,0,0,0.3)',
                          transition: 'font-size 0.15s',
                          paintOrder: 'stroke fill'
                        }}
                      >
                        {officeNum}
                      </text>
                      {/* Margin percentage - only on hover */}
                      {isHovered && office && (
                        <text
                          x={coords.x + coords.width/2}
                          y={coords.y + coords.height/2 + 22}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill={office.margin_percentage < 0 ? '#dc2626' : '#16a34a'}
                          fontSize="14"
                          fontWeight="bold"
                          fontFamily="system-ui, sans-serif"
                          className="pointer-events-none select-none"
                          style={{ textShadow: '0 0 4px white, 0 0 4px white, 0 0 4px white' }}
                        >
                          {office.margin_percentage.toFixed(1)}%
                        </text>
                      )}
                    </>
                  )}

                  {/* Office number in edit mode */}
                  {isSelected && editMode && (
                    <text
                      x={coords.x + coords.width/2}
                      y={coords.y - 10}
                      textAnchor="middle"
                      fill="#2563eb"
                      fontSize="18"
                      fontWeight="bold"
                      fontFamily="system-ui, sans-serif"
                      className="pointer-events-none select-none"
                      style={{ textShadow: '0 0 4px white, 0 0 4px white' }}
                    >
                      Oficina {officeNum}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {hoveredOffice && !editMode && (
        <div
          className="fixed z-50 bg-white border-2 border-black rounded-sm shadow-2xl p-3 pointer-events-none"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: 'translate(-50%, -100%)',
            minWidth: '240px'
          }}
        >
          <div className="space-y-1">
            <div className="font-secondary text-black font-bold text-sm border-b border-gray-200 pb-1 mb-2">
              Oficina {hoveredOffice.office_number}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-primary text-gray-500">Cliente:</span>
              <span className="text-xs font-primary font-semibold text-black">
                {hoveredOffice.client_name || <span className="italic text-gray-400">Disponible</span>}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-primary text-gray-500">Dimension:</span>
              <span className="text-xs font-primary text-gray-700">
                {hoveredOffice.square_meters}m2
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-primary text-gray-500">Capacidad:</span>
              <span className="text-xs font-primary text-gray-700">
                {hoveredOffice.capacity || Math.floor(hoveredOffice.square_meters / 3)} personas
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-primary text-gray-500">Ubicacion:</span>
              <span className="text-xs font-primary text-gray-700">
                {hoveredOffice.location}
              </span>
            </div>
            <div className="border-t border-gray-200 pt-1 mt-1">
              <div className="flex justify-between items-center">
                <span className="text-xs font-primary text-gray-500">Venta Esperada:</span>
                <span className="text-xs font-primary font-bold text-purple-600">
                  {formatUF(hoveredOffice.sale_value_uf)}
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs font-primary text-gray-500">Facturado:</span>
                <span className="text-xs font-primary font-bold text-green-600">
                  {formatUF(hoveredOffice.billed_value_uf)}
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs font-primary text-gray-500">Costo:</span>
                <span className="text-xs font-primary font-bold text-orange-600">
                  {formatUF(hoveredOffice.cost_uf)}
                </span>
              </div>
              <div className="flex justify-between items-center mt-1 pt-1 border-t border-gray-100">
                <span className="text-xs font-primary text-gray-600 font-semibold">Margen:</span>
                <span className={`text-sm font-primary font-bold ${
                  hoveredOffice.margin_percentage < 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {hoveredOffice.margin_percentage.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
