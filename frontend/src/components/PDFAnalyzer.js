import React, { useState } from 'react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Upload, FileText, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';

const PDFAnalyzer = ({ onAnalysisComplete }) => {
  const [file, setFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (selectedFile) => {
    setError('');
    
    if (!selectedFile) return;
    
    // Validar que sea PDF
    if (selectedFile.type !== 'application/pdf') {
      setError('Por favor selecciona un archivo PDF válido');
      return;
    }
    
    // Validar tamaño (máximo 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('El archivo es muy grande. Tamaño máximo: 10MB');
      return;
    }
    
    setFile(selectedFile);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    
    setAnalyzing(true);
    setError('');
    
    try {
      // Convertir PDF a base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = async () => {
        try {
          const base64Data = reader.result.split(',')[1];
          
          const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/templates/analyze-pdf`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              pdf_base64: base64Data,
              filename: file.name
            })
          });
          
          const result = await response.json();
          
          if (!response.ok) {
            throw new Error(result.detail || 'Error al analizar el PDF');
          }
          
          onAnalysisComplete(result);
          
          // Limpiar
          setFile(null);
        } catch (err) {
          setError(err.message);
        } finally {
          setAnalyzing(false);
        }
      };
      
      reader.onerror = () => {
        setError('Error al leer el archivo');
        setAnalyzing(false);
      };
      
    } catch (err) {
      setError(err.message);
      setAnalyzing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-orange-500" />
          Analizar PDF con IA
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? 'border-orange-500 bg-orange-50' 
                : 'border-gray-300 hover:border-orange-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {!file ? (
              <>
                <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <Label className="text-base font-medium block mb-2">
                  Arrastra tu PDF aquí o haz clic para seleccionar
                </Label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => handleFileChange(e.target.files[0])}
                  className="hidden"
                  id="pdf-upload"
                  disabled={analyzing}
                />
                <label htmlFor="pdf-upload">
                  <Button
                    variant="outline"
                    className="mt-2"
                    asChild
                    disabled={analyzing}
                  >
                    <span>Seleccionar PDF</span>
                  </Button>
                </label>
                <p className="text-xs text-gray-500 mt-3">
                  Tamaño máximo: 10MB
                </p>
              </>
            ) : (
              <div className="flex items-center justify-center gap-3">
                <FileText className="w-8 h-8 text-orange-500" />
                <div className="text-left">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFile(null)}
                  disabled={analyzing}
                >
                  Cambiar
                </Button>
              </div>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">¿Cómo funciona?</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• La IA analiza el contenido de tu PDF</li>
              <li>• Identifica automáticamente datos que pueden ser variables</li>
              <li>• Sugiere nombres de variables como {'{'}{'{'} client_name {'}'}{'}' }, {'{'}{'{'} total_value {'}'}{'}' }</li>
              <li>• Puedes editar el resultado antes de guardar la plantilla</li>
            </ul>
          </div>

          <Button
            onClick={handleAnalyze}
            disabled={!file || analyzing}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analizando PDF...
              </>
            ) : (
              'Analizar con IA'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PDFAnalyzer;
