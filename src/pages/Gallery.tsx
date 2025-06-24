import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

const Gallery = () => {
  const [selectedImage, setSelectedImage] = useState<number | null>(null);

  const projects = [
    {
      id: 1,
      title: 'Industrielle Prototypen',
      category: 'B2B',
      material: 'ABS',
      image: 'https://images.pexels.com/photos/3760767/pexels-photo-3760767.jpeg?auto=compress&cs=tinysrgb&w=800',
      description: 'Funktionale Prototypen für die Automobilindustrie mit hoher Präzision und Langlebigkeit.'
    },
    {
      id: 2,
      title: 'Architekturmodelle',
      category: 'B2B',
      material: 'PLA',
      image: 'https://images.pexels.com/photos/7947664/pexels-photo-7947664.jpeg?auto=compress&cs=tinysrgb&w=800',
      description: 'Detaillierte Architekturmodelle für Planungsbüros und Immobilienentwickler.'
    },
    {
      id: 3,
      title: 'Ersatzteile & Reparatur',
      category: 'B2C',
      material: 'PETG',
      image: 'https://images.pexels.com/photos/3760263/pexels-photo-3760263.jpeg?auto=compress&cs=tinysrgb&w=800',
      description: 'Maßgefertigte Ersatzteile für Haushaltsgeräte und Vintage-Artikel.'
    },
    {
      id: 4,
      title: 'Medizinische Hilfsmittel',
      category: 'B2B',
      material: 'PLA',
      image: 'https://images.pexels.com/photos/3845810/pexels-photo-3845810.jpeg?auto=compress&cs=tinysrgb&w=800',
      description: 'Individuelle Orthesen und Prothesen-Komponenten nach medizinischen Spezifikationen.'
    },
    {
      id: 5,
      title: 'Künstlerische Objekte',
      category: 'B2C',
      material: 'PLA',
      image: 'https://images.pexels.com/photos/3760848/pexels-photo-3760848.jpeg?auto=compress&cs=tinysrgb&w=800',
      description: 'Kreative Skulpturen und Kunstwerke mit komplexen geometrischen Formen.'
    },
    {
      id: 6,
      title: 'Funktionale Werkzeuge',
      category: 'B2B',
      material: 'ASA',
      image: 'https://images.pexels.com/photos/3846080/pexels-photo-3846080.jpeg?auto=compress&cs=tinysrgb&w=800',
      description: 'Robuste Werkzeuge und Vorrichtungen für den industriellen Einsatz.'
    },
    {
      id: 7,
      title: 'Haushaltshelfer',
      category: 'B2C',
      material: 'PLA',
      image: 'https://images.pexels.com/photos/3760769/pexels-photo-3760769.jpeg?auto=compress&cs=tinysrgb&w=800',
      description: 'Praktische Alltagsgegenstände und individuelle Lösungen für den Haushalt.'
    },
    {
      id: 8,
      title: 'Elektronik-Gehäuse',
      category: 'B2B',
      material: 'ABS',
      image: 'https://images.pexels.com/photos/3846081/pexels-photo-3846081.jpeg?auto=compress&cs=tinysrgb&w=800',
      description: 'Maßgeschneiderte Gehäuse für elektronische Geräte und Steuerungen.'
    },
    {
      id: 9,
      title: 'Schmuck & Accessories',
      category: 'B2C',
      material: 'PLA',
      image: 'https://images.pexels.com/photos/3846077/pexels-photo-3846077.jpeg?auto=compress&cs=tinysrgb&w=800',
      description: 'Filigraner Schmuck und modische Accessoires mit perfekter Oberflächenqualität.'
    }
  ];

  const categories = ['Alle', 'B2B', 'B2C'];
  const materials = ['Alle', ...Array.from(new Set(projects.map(p => p.material)))];
  
  const [selectedCategory, setSelectedCategory] = useState('Alle');
  const [selectedMaterial, setSelectedMaterial] = useState('Alle');

  const filteredProjects = projects.filter(project => {
    const categoryMatch = selectedCategory === 'Alle' || project.category === selectedCategory;
    const materialMatch = selectedMaterial === 'Alle' || project.material === selectedMaterial;
    return categoryMatch && materialMatch;
  });

  const openLightbox = (index: number) => {
    setSelectedImage(index);
  };

  const closeLightbox = () => {
    setSelectedImage(null);
  };

  const nextImage = () => {
    if (selectedImage !== null) {
      setSelectedImage((selectedImage + 1) % filteredProjects.length);
    }
  };

  const prevImage = () => {
    if (selectedImage !== null) {
      setSelectedImage(selectedImage === 0 ? filteredProjects.length - 1 : selectedImage - 1);
    }
  };

  return (
    <div className="py-16 animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Projekt-Galerie
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Entdecken Sie unsere vielfältigen 3D-Druckprojekte - von funktionalen Prototypen 
            bis hin zu kreativen Kunstwerken.
          </p>
        </div>

        {/* Filters */}
        <div className="mb-12">
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Kategorie:</span>
              <div className="flex space-x-2">
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedCategory === category
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Material:</span>
              <div className="flex space-x-2">
                {materials.map(material => (
                  <button
                    key={material}
                    onClick={() => setSelectedMaterial(material)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedMaterial === material
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {material}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProjects.map((project, index) => (
            <div
              key={project.id}
              className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200 hover:shadow-lg transition-shadow group cursor-pointer"
              onClick={() => openLightbox(index)}
            >
              <div className="relative overflow-hidden">
                <img
                  src={project.image}
                  alt={project.title}
                  className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-4 right-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    project.category === 'B2B'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {project.category}
                  </span>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {project.title}
                </h3>
                <p className="text-gray-600 mb-4 line-clamp-3">
                  {project.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="bg-primary-100 text-primary-800 px-3 py-1 rounded-full text-sm font-medium">
                    {project.material}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* No results message */}
        {filteredProjects.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              Keine Projekte gefunden. Versuchen Sie andere Filter.
            </p>
          </div>
        )}

        {/* Lightbox */}
        {selectedImage !== null && (
          <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
            <div className="relative max-w-4xl max-h-full">
              <button
                onClick={closeLightbox}
                className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
              >
                <X className="h-8 w-8" />
              </button>
              
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 z-10"
              >
                <ChevronLeft className="h-12 w-12" />
              </button>
              
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 z-10"
              >
                <ChevronRight className="h-12 w-12" />
              </button>

              <div className="bg-white rounded-lg overflow-hidden">
                <img
                  src={filteredProjects[selectedImage].image}
                  alt={filteredProjects[selectedImage].title}
                  className="w-full max-h-96 object-cover"
                />
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-2xl font-bold text-gray-900">
                      {filteredProjects[selectedImage].title}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        filteredProjects[selectedImage].category === 'B2B'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {filteredProjects[selectedImage].category}
                      </span>
                      <span className="bg-primary-100 text-primary-800 px-3 py-1 rounded-full text-sm font-medium">
                        {filteredProjects[selectedImage].material}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-600">
                    {filteredProjects[selectedImage].description}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Call to Action */}
        <div className="mt-16 text-center bg-primary-50 p-8 rounded-2xl">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Lassen Sie uns Ihr Projekt verwirklichen
          </h2>
          <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
            Haben Sie eine Idee für Ihr nächstes 3D-Druckprojekt? 
            Nutzen Sie unseren Konfigurator und erhalten Sie ein kostenloses Angebot.
          </p>
          <a
            href="/projekt-starten"
            className="bg-primary-600 text-white px-8 py-4 rounded-lg font-medium hover:bg-primary-700 transition-colors inline-block"
          >
            Projekt jetzt starten
          </a>
        </div>
      </div>
    </div>
  );
};

export default Gallery;