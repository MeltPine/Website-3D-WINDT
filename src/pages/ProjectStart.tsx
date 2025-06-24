import React, { useState, useRef } from 'react';
import { Upload, FileText, Calculator, CheckCircle, AlertCircle } from 'lucide-react';

// Editable pricing configuration
const PRICING_CONFIG = {
  pricePerGram: 0.45,
  cadHourlyRate: 60,
  scanFlatRate: 30,
  minimumOrder: 10,
  expressMultiplier: 1.5,
  finishingRates: {
    basic: 5,
    premium: 15
  }
};

const ProjectStart = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [weight, setWeight] = useState<string>('');
  const [needsCad, setNeedsCad] = useState(false);
  const [cadHours, setCadHours] = useState<string>('1');
  const [needsScan, setNeedsScan] = useState(false);
  const [expressDelivery, setExpressDelivery] = useState(false);
  const [finishing, setFinishing] = useState<'none' | 'basic' | 'premium'>('none');
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptedFileTypes = ['.stl', '.obj', '.3mf', '.svg'];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const validFiles = selectedFiles.filter(file => {
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      return acceptedFileTypes.includes(extension);
    });
    setFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const calculatePrice = () => {
    let total = 0;
    
    // 3D printing cost
    const weightNum = parseFloat(weight);
    if (weightNum > 0) {
      total += weightNum * PRICING_CONFIG.pricePerGram;
    }
    
    // CAD cost
    if (needsCad) {
      const hours = parseFloat(cadHours);
      total += hours * PRICING_CONFIG.cadHourlyRate;
    }
    
    // Scan cost
    if (needsScan) {
      total += PRICING_CONFIG.scanFlatRate;
    }
    
    // Finishing cost
    if (finishing === 'basic') {
      total += PRICING_CONFIG.finishingRates.basic;
    } else if (finishing === 'premium') {
      total += PRICING_CONFIG.finishingRates.premium;
    }
    
    // Express delivery
    if (expressDelivery) {
      total *= PRICING_CONFIG.expressMultiplier;
    }
    
    return Math.max(total, PRICING_CONFIG.minimumOrder);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would typically send the data to your backend
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="py-16 animate-fade-in">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-green-50 p-8 rounded-2xl">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Anfrage erfolgreich gesendet!
            </h1>
            <p className="text-lg text-gray-600 mb-6">
              Vielen Dank für Ihre Anfrage. Wir werden uns innerhalb von 24 Stunden 
              bei Ihnen melden und Ihnen ein detailliertes Angebot unterbreiten.
            </p>
            <button
              onClick={() => setSubmitted(false)}
              className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors"
            >
              Neue Anfrage starten
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-16 animate-fade-in">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Projekt starten
          </h1>
          <p className="text-xl text-gray-600">
            Laden Sie Ihre Dateien hoch und erhalten Sie ein kostenloses Angebot
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* File Upload */}
          <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-primary-400 transition-colors">
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Dateien hochladen
            </h3>
            <p className="text-gray-600 mb-4">
              Unterstützte Formate: STL, OBJ, 3MF, SVG (max. 50MB pro Datei)
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors"
            >
              Dateien auswählen
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".stl,.obj,.3mf,.svg"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {/* Uploaded Files */}
          {files.length > 0 && (
            <div className="bg-gray-50 p-6 rounded-xl">
              <h4 className="font-semibold text-gray-900 mb-4">Hochgeladene Dateien:</h4>
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-white p-3 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-primary-500" />
                      <span className="text-gray-900">{file.name}</span>
                      <span className="text-sm text-gray-500">
                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Entfernen
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Project Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Weight Input */}
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Gewicht schätzen
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Geschätztes Gewicht (in Gramm)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.1"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="z.B. 150"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Preis: {PRICING_CONFIG.pricePerGram}€ pro Gramm
                  </p>
                </div>
              </div>
            </div>

            {/* Additional Services */}
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Zusätzliche Services
              </h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="needsCad"
                    checked={needsCad}
                    onChange={(e) => setNeedsCad(e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="needsCad" className="ml-3 text-sm font-medium text-gray-700">
                    CAD-Modellierung benötigt ({PRICING_CONFIG.cadHourlyRate}€/h)
                  </label>
                </div>
                
                {needsCad && (
                  <div className="ml-7">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Geschätzte Stunden
                    </label>
                    <input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={cadHours}
                      onChange={(e) => setCadHours(e.target.value)}
                      className="w-24 border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                  </div>
                )}

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="needsScan"
                    checked={needsScan}
                    onChange={(e) => setNeedsScan(e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="needsScan" className="ml-3 text-sm font-medium text-gray-700">
                    3D-Scan benötigt ({PRICING_CONFIG.scanFlatRate}€ pauschal)
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="expressDelivery"
                    checked={expressDelivery}
                    onChange={(e) => setExpressDelivery(e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="expressDelivery" className="ml-3 text-sm font-medium text-gray-700">
                    Express-Lieferung (+50%)
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Finishing Options */}
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Nachbearbeitung
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="finishing"
                  value="none"
                  checked={finishing === 'none'}
                  onChange={(e) => setFinishing(e.target.value as any)}
                  className="h-4 w-4 text-primary-600"
                />
                <div>
                  <div className="font-medium">Keine</div>
                  <div className="text-sm text-gray-500">Standard Oberfläche</div>
                </div>
              </label>
              
              <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="finishing"
                  value="basic"
                  checked={finishing === 'basic'}
                  onChange={(e) => setFinishing(e.target.value as any)}
                  className="h-4 w-4 text-primary-600"
                />
                <div>
                  <div className="font-medium">Basic (+{PRICING_CONFIG.finishingRates.basic}€)</div>
                  <div className="text-sm text-gray-500">Schleifen & Glätten</div>
                </div>
              </label>
              
              <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="finishing"
                  value="premium"
                  checked={finishing === 'premium'}
                  onChange={(e) => setFinishing(e.target.value as any)}
                  className="h-4 w-4 text-primary-600"
                />
                <div>
                  <div className="font-medium">Premium (+{PRICING_CONFIG.finishingRates.premium}€)</div>
                  <div className="text-sm text-gray-500">Lackierung & Finish</div>
                </div>
              </label>
            </div>
          </div>

          {/* Price Calculator */}
          <div className="bg-primary-50 p-6 rounded-xl">
            <div className="flex items-center space-x-3 mb-4">
              <Calculator className="h-6 w-6 text-primary-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Preisschätzung
              </h3>
            </div>
            <div className="text-3xl font-bold text-primary-600 mb-2">
              {calculatePrice().toFixed(2)}€
            </div>
            <p className="text-sm text-gray-600">
              Unverbindliche Schätzung. Finales Angebot nach Prüfung Ihrer Dateien.
            </p>
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <strong>Mindestbestellwert:</strong> {PRICING_CONFIG.minimumOrder}€
                  {calculatePrice() < PRICING_CONFIG.minimumOrder && (
                    <span> - Ihr Projekt wird auf den Mindestbestellwert angehoben.</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Kontaktdaten
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo(prev => ({...prev, name: e.target.value}))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-Mail *
                </label>
                <input
                  type="email"
                  required
                  value={customerInfo.email}
                  onChange={(e) => setCustomerInfo(prev => ({...prev, email: e.target.value}))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefon
                </label>
                <input
                  type="tel"
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo(prev => ({...prev, phone: e.target.value}))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unternehmen
                </label>
                <input
                  type="text"
                  value={customerInfo.company}
                  onChange={(e) => setCustomerInfo(prev => ({...prev, company: e.target.value}))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Zusätzliche Anmerkungen
              </label>
              <textarea
                rows={4}
                value={customerInfo.message}
                onChange={(e) => setCustomerInfo(prev => ({...prev, message: e.target.value}))}
                placeholder="Besondere Wünsche, Liefertermin, etc."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="text-center">
            <button
              type="submit"
              className="bg-primary-600 text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-primary-700 transition-colors"
            >
              Kostenlose Anfrage senden
            </button>
            <p className="text-sm text-gray-500 mt-2">
              Wir melden uns innerhalb von 24 Stunden bei Ihnen
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectStart;