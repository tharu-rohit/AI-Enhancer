
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { fileToBase64 } from '../utils/mediaUtils';
import { enhanceImage } from '../services/geminiService';

const UploadIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
);

const ComparisonSlider: React.FC<{ original: string; enhanced: string }> = ({ original, enhanced }) => {
    const [sliderPos, setSliderPos] = useState(50);
    const imageContainerRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);

    const handleMove = useCallback((clientX: number) => {
        if (!isDragging.current || !imageContainerRef.current) return;
        const rect = imageContainerRef.current.getBoundingClientRect();
        let newX = clientX - rect.left;
        if (newX < 0) newX = 0;
        if (newX > rect.width) newX = rect.width;
        setSliderPos((newX / rect.width) * 100);
    }, []);

    const handleMouseDown = () => { isDragging.current = true; };
    const handleMouseUp = () => { isDragging.current = false; };
    const handleMouseLeave = () => { isDragging.current = false; };
    
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => handleMove(e.clientX);
    const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => handleMove(e.touches[0].clientX);

    useEffect(() => {
        const handleMouseUpGlobal = () => { isDragging.current = false; };
        window.addEventListener('mouseup', handleMouseUpGlobal);
        return () => window.removeEventListener('mouseup', handleMouseUpGlobal);
    }, []);

    return (
        <div 
            ref={imageContainerRef}
            className="relative w-full max-w-2xl mx-auto aspect-[4/3] rounded-lg overflow-hidden cursor-ew-resize select-none shadow-xl no-select"
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleMouseDown}
            onTouchEnd={handleMouseUp}
            onTouchMove={handleTouchMove}
        >
            <img src={original} alt="Original" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
            <div className="absolute inset-0 w-full h-full pointer-events-none" style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}>
                <img src={enhanced} alt="Enhanced" className="absolute inset-0 w-full h-full object-contain" />
            </div>
            <div className="absolute top-0 bottom-0 bg-white w-1 pointer-events-none" style={{ left: `calc(${sliderPos}% - 2px)` }}>
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 bg-white rounded-full h-10 w-10 flex items-center justify-center shadow-md">
                    <div className="h-6 w-6 text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15 12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const PhotoEnhancer: React.FC = () => {
    const [originalImage, setOriginalImage] = useState<string | null>(null);
    const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setEnhancedImage(null);
            setError(null);
            setImageFile(file);
            const reader = new FileReader();
            reader.onload = (event) => {
                setOriginalImage(event.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleEnhance = async () => {
        if (!imageFile) return;
        setIsLoading(true);
        setError(null);
        setEnhancedImage(null);
        try {
            const base64Image = await fileToBase64(imageFile);
            const enhancedBase64 = await enhanceImage(base64Image, imageFile.type);
            setEnhancedImage(`data:${imageFile.type};base64,${enhancedBase64}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-gray-800/50 rounded-xl p-6 md:p-8 shadow-inner">
            <div className="flex flex-col items-center">
                {!originalImage && (
                    <div className="w-full text-center">
                         <h2 className="text-xl font-semibold text-gray-100 mb-2">Enhance Your Photos Instantly</h2>
                        <p className="text-gray-400 mb-6">Upload an image to see the magic of AI enhancement.</p>
                        <label className="cursor-pointer inline-flex items-center justify-center px-6 py-3 border border-dashed border-gray-500 rounded-lg text-gray-300 hover:text-white hover:border-indigo-500 transition-colors">
                            <UploadIcon className="w-6 h-6 mr-2"/>
                            <span>Select Image</span>
                            <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                        </label>
                    </div>
                )}

                {originalImage && !enhancedImage && (
                    <div className="w-full flex flex-col items-center">
                        <h2 className="text-xl font-semibold text-gray-100 mb-4">Ready to Enhance?</h2>
                        <img src={originalImage} alt="Preview" className="max-w-md w-full h-auto rounded-lg shadow-lg mb-6" />
                        <div className="flex items-center space-x-4">
                             <label className="cursor-pointer text-sm text-indigo-400 hover:text-indigo-300">
                                Change Image
                                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                            </label>
                            <button onClick={handleEnhance} disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-900 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-lg transition-all duration-300 flex items-center shadow-md">
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Enhancing...
                                    </>
                                ) : 'Enhance Now'}
                            </button>
                        </div>
                    </div>
                )}

                {error && <p className="text-red-400 mt-4">Error: {error}</p>}
                
                {originalImage && enhancedImage && (
                    <div className="w-full flex flex-col items-center">
                        <h2 className="text-2xl font-bold text-gray-100 mb-2">Enhancement Complete</h2>
                        <p className="text-gray-400 mb-6">Slide to compare the original and enhanced images.</p>
                        <ComparisonSlider original={originalImage} enhanced={enhancedImage} />
                         <div className="flex items-center space-x-4 mt-6">
                            <label className="cursor-pointer text-sm text-indigo-400 hover:text-indigo-300">
                                Upload Another
                                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                            </label>
                            <a href={enhancedImage} download="enhanced-image.png" className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">
                                Download
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
