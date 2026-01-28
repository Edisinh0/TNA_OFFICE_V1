import React, { useState, useEffect } from 'react';
import apiClient from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import PDFAnalyzer from './PDFAnalyzer';
import { FileText, Eye, Trash2, Edit, FilePlus, Upload } from 'lucide-react';
import { toast } from 'sonner';

const TemplatesTab = () => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [mode, setMode] = useState('list'); // list, create-manual, create-pdf, edit
  const [isLoading, setIsLoading] = useState(false);
  const [analyzedData, setAnalyzedData] = useState(null);
  
  // Form states
  const [templateName, setTemplateName] = useState('');
  const [templateContent, setTemplateContent] = useState('');

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

  const availableVariables = [
    { key: 'client_name', label: 'Nombre Cliente' },
    { key: 'quote_number', label: 'Número Cotización' },
    { key: 'total_offices', label: 'Total Oficinas' },
    { key: 'total_m2', label: 'Total m²' },
    { key: 'total_capacity', label: 'Capacidad Total' },
    { key: 'total_value', label: 'Valor Total' },
    { key: 'date', label: 'Fecha' },
    { key: 'company_name', label: 'Nombre Empresa' }
  ];

  const handleInsertVariable = (varKey) => {
    setTemplateContent(prev => prev + `{{${varKey}}}`);
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim() || !templateContent.trim()) {
      toast.error('Completa todos los campos');
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'edit' && selectedTemplate) {
        await apiClient.put(`/templates/${selectedTemplate.id}`, {
          name: templateName,
          content: templateContent
        });
        toast.success('Plantilla actualizada');
      } else {
        await apiClient.post('/templates', {
          name: templateName,
          content: templateContent,
          created_from: 'manual'
        });
        toast.success('Plantilla creada');
      }
      
      setMode('list');
      setSelectedTemplate(null);
      setTemplateName('');
      setTemplateContent('');
      await loadTemplates();
    } catch (error) {
      toast.error('Error al guardar plantilla');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalysisComplete = (result) => {
    setAnalyzedData(result);
    setTemplateName(`Plantilla ${result.filename.replace('.pdf', '')}`);
    setTemplateContent(result.analyzed_content);
    toast.success('PDF analizado exitosamente');
  };

  const handleEdit = (template) => {
    setSelectedTemplate(template);
    setTemplateName(template.name);
    setTemplateContent(template.content);
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

  // Vista de lista
  if (mode === 'list') {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setMode('create-manual');
                setTemplateName('');
                setTemplateContent('');
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
                          {template.created_from === 'pdf' ? 'PDF' : 'Manual'}
                        </span>
                        <span>{new Date(template.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <FileText className="w-8 h-8 text-orange-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">Variables ({template.variables?.length || 0}):</p>
                    <div className="flex flex-wrap gap-1">
                      {template.variables && template.variables.length > 0 ? (
                        template.variables.slice(0, 3).map((variable) => (
                          <span key={variable} className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                            {variable}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400">Sin variables</span>
                      )}
                      {template.variables && template.variables.length > 3 && (
                        <span className="text-xs text-gray-500">+{template.variables.length - 3}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleViewDetail(template)} className="flex-1">
                      <Eye className="w-4 h-4 mr-1" />
                      Ver
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(template)} className="flex-1">
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
                  <Label className="text-sm font-medium">Variables ({selectedTemplate.variables?.length || 0}):</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedTemplate.variables?.map((variable) => (
                      <span key={variable} className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                        {'{'}{'{'}{variable}{'}'}{'}'} 
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Contenido:</Label>
                  <div className="mt-2 p-4 bg-gray-50 rounded border border-gray-200 whitespace-pre-wrap">
                    {selectedTemplate.content}
                  </div>
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
      <div>
        <Button variant="ghost" onClick={() => setMode('list')} className="mb-4">
          ← Volver
        </Button>
        <h2 className="text-2xl font-bold mb-4">
          {mode === 'edit' ? 'Editar Plantilla' : 'Nueva Plantilla Manual'}
        </h2>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <Label>Nombre de la Plantilla</Label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Ej: Plantilla Estándar"
                disabled={isLoading}
              />
            </div>

            <div>
              <Label>Variables Disponibles</Label>
              <div className="flex flex-wrap gap-2 mt-2 p-3 bg-gray-50 rounded">
                {availableVariables.map((v) => (
                  <Button
                    key={v.key}
                    variant="outline"
                    size="sm"
                    onClick={() => handleInsertVariable(v.key)}
                    disabled={isLoading}
                  >
                    + {v.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label>Contenido</Label>
              <Textarea
                value={templateContent}
                onChange={(e) => setTemplateContent(e.target.value)}
                placeholder="Escribe el contenido de tu plantilla. Usa las variables arriba para insertar datos dinámicos."
                rows={15}
                disabled={isLoading}
                className="font-mono"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSaveTemplate}
                disabled={isLoading || !templateName.trim() || !templateContent.trim()}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {isLoading ? 'Guardando...' : 'Guardar Plantilla'}
              </Button>
              <Button variant="outline" onClick={() => setMode('list')} disabled={isLoading}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Vista de crear desde PDF
  if (mode === 'create-pdf') {
    return (
      <div>
        <Button variant="ghost" onClick={() => setMode('list')} className="mb-4">
          ← Volver
        </Button>
        <h2 className="text-2xl font-bold mb-4">Crear Plantilla desde PDF</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PDFAnalyzer onAnalysisComplete={handleAnalysisComplete} />

          {analyzedData && (
            <Card>
              <CardHeader>
                <CardTitle>Resultado del Análisis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Nombre de Plantilla</Label>
                  <Input
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Nombre"
                  />
                </div>

                <div>
                  <Label>Variables detectadas ({analyzedData.variables.length})</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {analyzedData.variables.map((v) => (
                      <span key={v} className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                        {'{'}{'{'}{v}{'}'}{'}'} 
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Contenido Procesado</Label>
                  <Textarea
                    value={templateContent}
                    onChange={(e) => setTemplateContent(e.target.value)}
                    rows={12}
                    className="font-mono text-xs"
                  />
                </div>

                <Button
                  onClick={handleSaveTemplate}
                  disabled={isLoading}
                  className="w-full bg-orange-500 hover:bg-orange-600"
                >
                  {isLoading ? 'Guardando...' : 'Guardar Plantilla'}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default TemplatesTab;
