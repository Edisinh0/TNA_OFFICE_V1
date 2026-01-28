import React, { useState, useEffect } from 'react';
import apiClient from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import QuoteTemplateEditor from '../components/QuoteTemplateEditor';
import PDFAnalyzer from '../components/PDFAnalyzer';
import { FileText, Eye, Trash2, Edit, Plus, Upload, FilePlus } from 'lucide-react';
import { toast } from 'sonner';

export const QuoteTemplates = () => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [mode, setMode] = useState('list'); // list, create-manual, create-pdf, edit
  const [isLoading, setIsLoading] = useState(false);
  const [analyzedData, setAnalyzedData] = useState(null);
  const [activeTab, setActiveTab] = useState('manual');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await apiClient.get('/templates');
      setTemplates(response.data);
    } catch (error) {
      toast.error('Error al cargar plantillas');
    }
  };

  const handleSaveManualTemplate = async (templateData) => {
    setIsLoading(true);
    try {
      if (mode === 'edit' && selectedTemplate) {
        await apiClient.put(`/templates/${selectedTemplate.id}`, templateData);
        toast.success('Plantilla actualizada exitosamente');
      } else {
        await apiClient.post('/templates', {
          ...templateData,
          created_from: 'manual'
        });
        toast.success('Plantilla creada exitosamente');
      }
      
      setMode('list');
      setSelectedTemplate(null);
      await loadTemplates();
    } catch (error) {
      toast.error('Error al guardar la plantilla');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalysisComplete = (result) => {
    setAnalyzedData(result);
    toast.success('PDF analizado exitosamente. Revisa el contenido y guarda la plantilla.');
  };

  const handleSavePDFTemplate = async (templateData) => {
    setIsLoading(true);
    try {
      // Primero crear la plantilla con el contenido analizado
      await apiClient.post('/templates', {
        ...templateData,
        created_from: 'pdf'
      });
      
      toast.success('Plantilla creada desde PDF exitosamente');
      setAnalyzedData(null);
      setMode('list');
      await loadTemplates();
    } catch (error) {
      toast.error('Error al guardar la plantilla desde PDF');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (template) => {
    setSelectedTemplate(template);
    setMode('edit');
  };

  const handleDelete = async (templateId) => {
    if (!window.confirm('¿Eliminar esta plantilla?')) return;
    
    try {
      await apiClient.delete(`/templates/${templateId}`);
      toast.success('Plantilla eliminada');
      await loadTemplates();
    } catch (error) {
      toast.error('Error al eliminar plantilla');
    }
  };

  const handleViewDetail = (template) => {
    setSelectedTemplate(template);
    setShowDetailModal(true);
  };

  // Vista de lista de plantillas
  if (mode === 'list') {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Plantillas de Cotización</h1>
            <p className="text-gray-600 mt-1">Gestiona plantillas para generar cotizaciones profesionales</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setMode('create-manual');
                setSelectedTemplate(null);
              }}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <FilePlus className="w-4 h-4 mr-2" />
              Nueva Plantilla
            </Button>
            <Button
              onClick={() => {
                setMode('create-pdf');
                setAnalyzedData(null);
              }}
              variant="outline"
              className="border-orange-500 text-orange-500 hover:bg-orange-50"
            >
              <Upload className="w-4 h-4 mr-2" />
              Desde PDF
            </Button>
          </div>
        </div>

        {templates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay plantillas</h3>
              <p className="text-gray-600 mb-4">Crea tu primera plantilla manualmente o desde un PDF</p>
              <div className="flex gap-2 justify-center">
                <Button
                  onClick={() => setMode('create-manual')}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  Crear Plantilla Manual
                </Button>
                <Button
                  onClick={() => setMode('create-pdf')}
                  variant="outline"
                >
                  Analizar PDF con IA
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-1">{template.name}</CardTitle>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className={`px-2 py-0.5 rounded ${
                          template.created_from === 'pdf' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {template.created_from === 'pdf' ? 'Desde PDF' : 'Manual'}
                        </span>
                        <span>{new Date(template.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <FileText className="w-8 h-8 text-orange-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">Variables incluidas:</p>
                    <div className="flex flex-wrap gap-1">
                      {template.variables && template.variables.length > 0 ? (
                        template.variables.slice(0, 4).map((variable) => (
                          <span
                            key={variable}
                            className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded"
                          >
                            {variable}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400">Sin variables</span>
                      )}
                      {template.variables && template.variables.length > 4 && (
                        <span className="text-xs text-gray-500">
                          +{template.variables.length - 4} más
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetail(template)}
                      className="flex-1"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Ver
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(template)}
                      className="flex-1"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(template.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Modal de detalle */}
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedTemplate?.name}</DialogTitle>
            </DialogHeader>
            {selectedTemplate && (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Origen:</Label>
                  <p className="text-sm text-gray-600">
                    {selectedTemplate.created_from === 'pdf' ? 'Creado desde PDF' : 'Creado manualmente'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Variables ({selectedTemplate.variables?.length || 0}):</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedTemplate.variables?.map((variable) => (
                      <span
                        key={variable}
                        className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded"
                      >
                        {'{'}{'{'}{variable}{'}'}{'}'} 
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Contenido:</Label>
                  <div 
                    className="mt-2 p-4 bg-gray-50 rounded border border-gray-200 prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: selectedTemplate.content }}
                  />
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Vista de crear/editar manual
  if (mode === 'create-manual' || mode === 'edit') {
    return (
      <div className="p-6">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => {
              setMode('list');
              setSelectedTemplate(null);
            }}
            className="mb-4"
          >
            ← Volver a plantillas
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">
            {mode === 'edit' ? 'Editar Plantilla' : 'Nueva Plantilla Manual'}
          </h1>
          <p className="text-gray-600 mt-1">
            Crea una plantilla personalizada con editor de texto enriquecido
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <QuoteTemplateEditor
              onSave={handleSaveManualTemplate}
              initialContent={selectedTemplate?.content || ''}
              initialName={selectedTemplate?.name || ''}
              mode={mode}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Vista de crear desde PDF
  if (mode === 'create-pdf') {
    return (
      <div className="p-6">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => {
              setMode('list');
              setAnalyzedData(null);
            }}
            className="mb-4"
          >
            ← Volver a plantillas
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Crear Plantilla desde PDF</h1>
          <p className="text-gray-600 mt-1">
            Sube un PDF y la IA lo analizará para crear una plantilla con variables automáticas
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Panel de análisis */}
          <div>
            <PDFAnalyzer onAnalysisComplete={handleAnalysisComplete} />
          </div>

          {/* Panel de resultado */}
          <div>
            {analyzedData ? (
              <Card>
                <CardHeader>
                  <CardTitle>Resultado del Análisis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Archivo:</Label>
                    <p className="text-sm text-gray-600">{analyzedData.filename}</p>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Variables detectadas ({analyzedData.variables.length}):</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {analyzedData.variables.map((variable) => (
                        <span
                          key={variable}
                          className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded"
                        >
                          {'{'}{'{'}{variable}{'}'}{'}'} 
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Contenido Procesado:</Label>
                    <div className="mt-2 p-4 bg-gray-50 rounded border border-gray-200 max-h-96 overflow-y-auto">
                      <pre className="text-xs whitespace-pre-wrap">{analyzedData.analyzed_content}</pre>
                    </div>
                  </div>

                  <QuoteTemplateEditor
                    onSave={handleSavePDFTemplate}
                    initialContent={analyzedData.analyzed_content}
                    initialName={`Plantilla ${analyzedData.filename.replace('.pdf', '')}`}
                    mode="create"
                    isLoading={isLoading}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  <Upload className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p>Sube un PDF para ver el resultado del análisis aquí</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};
