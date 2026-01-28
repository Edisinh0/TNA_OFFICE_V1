/**
 * TNA Office - Pagina de Reportes
 *
 * Permite descargar reportes de ventas y comisiones en formato Excel/CSV.
 * Utiliza el apiClient centralizado para todas las peticiones.
 */

import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { downloadFile } from '../utils/api';

export const Reports = () => {
  const [downloading, setDownloading] = useState(null);

  /**
   * Descarga un reporte usando el cliente API centralizado
   * @param {string} type - Tipo de reporte ('sales' o 'commissions')
   */
  const downloadReport = async (type) => {
    setDownloading(type);
    try {
      const filename = type === 'sales'
        ? 'ventas_tna_office.xlsx'
        : 'comisiones_tna_office.xlsx';

      await downloadFile(`/reports/${type}/excel`, filename);
      toast.success('Reporte descargado exitosamente');
    } catch (error) {
      console.error('[Reports] Error descargando reporte:', error);

      if (error.response?.status === 404) {
        toast.error('El endpoint de reportes no esta disponible');
      } else if (error.response?.status === 500) {
        toast.error('Error del servidor al generar el reporte');
      } else {
        toast.error('Error al descargar reporte. Intenta nuevamente.');
      }
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-6" data-testid="reports-page">
      <div>
        <h1 className="font-secondary text-4xl md:text-5xl font-black uppercase text-black tracking-tight">
          REPORTES
        </h1>
        <div className="h-1 w-32 tna-gradient mt-4"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-white border-gray-200 rounded-sm hover:border-zinc-700 transition-colors duration-300">
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="font-secondary uppercase text-black flex items-center gap-3">
              <FileSpreadsheet className="w-6 h-6 text-[#00E5FF]" strokeWidth={1.5} />
              REPORTE DE VENTAS
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <p className="text-gray-600 font-primary text-sm">
              Exporta el historial completo de ventas incluyendo productos, categorias, cantidades, precios, comisiones y clientes.
            </p>
            <div className="space-y-2">
              <div className="text-gray-500 text-xs font-primary">• Fecha de venta</div>
              <div className="text-gray-500 text-xs font-primary">• Producto y categoria</div>
              <div className="text-gray-500 text-xs font-primary">• Cantidad y precios</div>
              <div className="text-gray-500 text-xs font-primary">• Comision y comisionista</div>
              <div className="text-gray-500 text-xs font-primary">• Informacion del cliente</div>
            </div>
            <Button
              data-testid="download-sales-report"
              onClick={() => downloadReport('sales')}
              disabled={downloading !== null}
              className="w-full bg-white text-black hover:bg-zinc-200 rounded-sm font-bold uppercase tracking-wide font-secondary disabled:opacity-50"
            >
              {downloading === 'sales' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  DESCARGANDO...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  DESCARGAR EXCEL
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200 rounded-sm hover:border-zinc-700 transition-colors duration-300">
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="font-secondary uppercase text-black flex items-center gap-3">
              <FileSpreadsheet className="w-6 h-6 text-[#FF8A00]" strokeWidth={1.5} />
              REPORTE DE COMISIONES
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <p className="text-gray-600 font-primary text-sm">
              Exporta el resumen de comisiones por comisionista incluyendo totales de ventas, comisiones pendientes y pagadas.
            </p>
            <div className="space-y-2">
              <div className="text-gray-500 text-xs font-primary">• Nombre y email del comisionista</div>
              <div className="text-gray-500 text-xs font-primary">• Total de ventas realizadas</div>
              <div className="text-gray-500 text-xs font-primary">• Total de comisiones</div>
              <div className="text-gray-500 text-xs font-primary">• Comisiones pendientes</div>
              <div className="text-gray-500 text-xs font-primary">• Comisiones pagadas</div>
            </div>
            <Button
              data-testid="download-commissions-report"
              onClick={() => downloadReport('commissions')}
              disabled={downloading !== null}
              className="w-full bg-white text-black hover:bg-zinc-200 rounded-sm font-bold uppercase tracking-wide font-secondary disabled:opacity-50"
            >
              {downloading === 'commissions' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  DESCARGANDO...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  DESCARGAR EXCEL
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white border-gray-200 rounded-sm">
        <CardHeader className="border-b border-gray-200">
          <CardTitle className="font-secondary uppercase text-black">INFORMACION</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-3 text-sm font-primary text-gray-600">
            <p>• Los reportes se generan con los datos actuales del sistema.</p>
            <p>• Los archivos Excel son compatibles con Microsoft Excel, Google Sheets y LibreOffice.</p>
            <p>• Los reportes incluyen unicamente los registros activos.</p>
            <p>• Para reportes personalizados, contacta al administrador del sistema.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
