
import React, { useState, useCallback } from 'react';
import { PhotoEnhancer } from './components/PhotoEnhancer';
import { VideoEnhancer } from './components/VideoEnhancer';
import { Header } from './components/Header';
import { EnhancementMode } from './types';

const App: React.FC = () => {
  const [mode, setMode] = useState<EnhancementMode>(EnhancementMode.Photo);

  const renderEnhancer = useCallback(() => {
    switch (mode) {
      case EnhancementMode.Photo:
        return <PhotoEnhancer />;
      case EnhancementMode.Video:
        return <VideoEnhancer />;
      default:
        return null;
    }
  }, [mode]);

  const getButtonClass = (buttonMode: EnhancementMode) => {
    return `w-full py-3 px-4 text-sm md:text-base font-bold rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 ${
      mode === buttonMode
        ? 'bg-indigo-600 text-white shadow-lg'
        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
    }`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-800 rounded-xl p-2 mb-8 shadow-2xl flex space-x-2">
            <button
              onClick={() => setMode(EnhancementMode.Photo)}
              className={getButtonClass(EnhancementMode.Photo)}
            >
              Photo Enhancement
            </button>
            <button
              onClick={() => setMode(EnhancementMode.Video)}
              className={getButtonClass(EnhancementMode.Video)}
            >
              Video Enhancement
            </button>
          </div>
          {renderEnhancer()}
        </div>
      </main>
    </div>
  );
};

export default App;
