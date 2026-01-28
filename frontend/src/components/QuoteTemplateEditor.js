import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Card } from './ui/card';

const QuoteTemplateEditor = ({ onSave, initialContent = '', initialName = '', mode = 'create', isLoading = false }) => {
  const [editorValue, setEditorValue] = useState(initialContent);
  const [templateName, setTemplateName] = useState(initialName);

  useEffect(() => {
    setEditorValue(initialContent);
    setTemplateName(initialName);
  }, [initialContent, initialName]);

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['link'],
      ['clean']
    ]
  };

  const formats = [
    'header',
    'bold',
    'italic',
    'underline',
    'list',
    'bullet',
    'align',
    'link'
  ];

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

  const handleInsertVariable = (variableKey) => {
    const currentContent = editorValue || '';
    const newContent = currentContent + `{{${variableKey}}}`;
    setEditorValue(newContent);
  };

  const handleSave = () => {
    if (!templateName.trim() || !editorValue.trim()) {
      return;
    }
    
    onSave({
      name: templateName,
      content: editorValue
    });
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <Label className="text-sm font-medium mb-2 block">Nombre de la Plantilla</Label>
        <Input
          type="text"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          placeholder="Ej: Plantilla Estándar de Oficinas"
          className="w-full"
          disabled={isLoading}
        />
      </div>

      <div className="mb-4">
        <Label className="text-sm font-medium mb-2 block">Variables Disponibles</Label>
        <Card className="p-3 bg-gray-50">
          <div className="flex flex-wrap gap-2">
            {availableVariables.map((variable) => (
              <Button
                key={variable.key}
                variant="outline"
                size="sm"
                onClick={() => handleInsertVariable(variable.key)}
                className="text-xs bg-white hover:bg-orange-50 hover:border-orange-400"
                disabled={isLoading}
              >
                + {variable.label}
              </Button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Haz clic para insertar variables que se reemplazarán automáticamente con datos reales
          </p>
        </Card>
      </div>

      <div className="mb-4">
        <Label className="text-sm font-medium mb-2 block">Contenido de la Plantilla</Label>
        <ReactQuill
          theme="snow"
          value={editorValue}
          onChange={setEditorValue}
          modules={modules}
          formats={formats}
          placeholder="Escribe el contenido de tu plantilla aquí... Usa las variables para insertar datos dinámicos."
          className="bg-white rounded border border-gray-300"
          style={{ height: '400px', marginBottom: '50px' }}
          readOnly={isLoading}
        />
      </div>

      <div className="flex gap-3">
        <Button
          onClick={handleSave}
          disabled={isLoading || !templateName.trim() || !editorValue.trim()}
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          {isLoading ? 'Guardando...' : mode === 'edit' ? 'Actualizar Plantilla' : 'Guardar Plantilla'}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setEditorValue('');
            setTemplateName('');
          }}
          disabled={isLoading}
          className="border-gray-300"
        >
          Limpiar
        </Button>
      </div>
    </div>
  );
};

export default QuoteTemplateEditor;
