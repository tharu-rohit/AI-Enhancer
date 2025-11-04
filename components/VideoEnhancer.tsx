import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fileToBase64, extractVideoFrame } from '../utils/mediaUtils';
import { generateVideoFromFrame } from '../services/geminiService';
import { VideoGenerationStatus } from '../types';

// This is a placeholder for window.aistudio
// FIX: Removed conflicting global declaration for window.aistudio.
// The type seems to be provided by the execution environment, and the
// local declaration caused a conflict. We will use a type assertion
// to `any` to interact with this external object.

const ApiKeySelector: React.FC<{ onKeySelected: () => void }> = ({ onKeySelected }) => {
    const [showSelector, setShowSelector] = useState(false);

    useEffect(() => {
        const checkKey = async () => {
            // FIX: Use type assertion to access window.aistudio without a conflicting global declaration.
            if ((window as any).aistudio && typeof (window as any).aistudio.hasSelectedApiKey === 'function') {
                const hasKey = await (window as any).aistudio.hasSelectedApiKey();
                if (!hasKey) {
                    setShowSelector(true);
                } else {
                    onKeySelected();
                }
            } else {
                // Fallback or error for when aistudio is not available
                console.warn('aistudio API not found. Assuming key is available via environment.');
                onKeySelected();
            }
        };
        checkKey();
    }, [onKeySelected]);

    const handleSelectKey = async () => {
        // FIX: Use type assertion to access window.aistudio without a conflicting global declaration.
        await (window as any).aistudio.openSelectKey();
        // Assume success and optimistically hide selector
        setShowSelector(false);
        onKeySelected();
    };

    if (!showSelector) return null;

    return (
        <div className="bg-yellow-900/30 border border-yellow-700 text-yellow-200 px-4 py-3 rounded-lg relative" role="alert">
            <strong className="font-bold">API Key Required!</strong>
            <span className="block sm:inline ml-2">Video generation requires an API key. Please select one to proceed.</span>
            <div className='mt-4'>
                <button onClick={handleSelectKey} className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded transition-colors">
                    Select API Key
                </button>
                 <p className="text-xs mt-2 text-yellow-300">
                    For information on billing, see the <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-yellow-100">billing documentation</a>.
                </p>
            </div>
        </div>
    );
};


const Loader: React.FC<{ status: VideoGenerationStatus }> = ({ status }) => (
    <div className="w-full max-w-lg text-center">
        <h3 className="text-2xl font-bold text-indigo-300 mb-4">{status.message}</h3>
        <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
            <div
                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-4 rounded-full transition-all duration-500"
                style={{ width: `${status.progress}%` }}
            ></div>
        </div>
    </div>
);


const UploadIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
);


export const VideoEnhancer: React.FC = () => {
    const [isKeySelected, setIsKeySelected] = useState(false);
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [firstFrame, setFirstFrame] = useState<string | null>(null);
    const [aspectRatio, setAspectRatio] = useState<string>('16:9');
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<VideoGenerationStatus>({ message: '', progress: 0 });
    const [error, setError] = useState<string | null>(null);
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
    
    const examplePrompts = useMemo(() => [
        "Make this look like a cinematic movie scene",
        "Add a subtle magical glow",
        "Transform this into a vintage film",
        "Animate this with a watercolor effect"
    ], []);

    const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setVideoFile(file);
            setGeneratedVideoUrl(null);
            setError(null);
            setFirstFrame(null);
            try {
                const { frame, aspectRatio: ar } = await extractVideoFrame(file);
                setFirstFrame(frame);
                setAspectRatio(ar);
            } catch (err) {
                setError('Failed to extract frame from video.');
                console.error(err);
            }
        }
    }, []);

    const handleGenerate = async () => {
        if (!firstFrame || !prompt || !isKeySelected) return;

        setIsLoading(true);
        setError(null);
        setGeneratedVideoUrl(null);
        setStatus({ message: 'Starting...', progress: 0 });

        try {
            const videoUrl = await generateVideoFromFrame(prompt, firstFrame, aspectRatio, setStatus);
            setGeneratedVideoUrl(videoUrl);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            if(errorMessage.includes("Requested entity was not found")){
                 setError("API Key not found or invalid. Please select your key again.");
                 setIsKeySelected(false); // Force re-selection
            } else {
                 setError(errorMessage);
            }
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };
    
    const reset = () => {
        setVideoFile(null);
        setFirstFrame(null);
        setPrompt('');
        setIsLoading(false);
        setError(null);
        setGeneratedVideoUrl(null);
    };

    if (!isKeySelected) {
        return (
            <div className="bg-gray-800/50 rounded-xl p-6 md:p-8 shadow-inner">
                <ApiKeySelector onKeySelected={() => setIsKeySelected(true)} />
            </div>
        );
    }

    return (
        <div className="bg-gray-800/50 rounded-xl p-6 md:p-8 shadow-inner flex flex-col items-center">
            {isLoading && <Loader status={status} />}

            {!isLoading && !videoFile && (
                 <div className="w-full text-center">
                    <h2 className="text-xl font-semibold text-gray-100 mb-2">Re-imagine Your Videos</h2>
                    <p className="text-gray-400 mb-6">Upload a video, describe a new style, and let AI generate a new clip.</p>
                    <label className="cursor-pointer inline-flex items-center justify-center px-6 py-3 border border-dashed border-gray-500 rounded-lg text-gray-300 hover:text-white hover:border-indigo-500 transition-colors">
                        <UploadIcon className="w-6 h-6 mr-2"/>
                        <span>Select Video</span>
                        <input type="file" className="hidden" accept="video/*" onChange={handleFileChange} />
                    </label>
                </div>
            )}
            
            {!isLoading && videoFile && !generatedVideoUrl && (
                <div className="w-full max-w-2xl">
                    <div className="flex flex-col md:flex-row gap-6">
                        <div className="flex-shrink-0">
                            <h3 className="text-lg font-semibold mb-2 text-gray-300">Video Start Frame</h3>
                            {firstFrame ? (
                                <img src={`data:image/jpeg;base64,${firstFrame}`} alt="First frame of video" className="rounded-lg shadow-lg w-full md:w-64" />
                            ) : (
                                <div className="rounded-lg bg-gray-700 w-full md:w-64 aspect-video flex items-center justify-center">
                                    <p className="text-gray-400">Extracting frame...</p>
                                </div>
                            )}
                        </div>
                        <div className="flex-grow">
                            <h3 className="text-lg font-semibold mb-2 text-gray-300">Describe the enhancement</h3>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="e.g., A cinematic shot with dramatic lighting"
                                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-gray-200"
                                rows={3}
                            />
                            <div className="text-xs text-gray-400 mt-2">
                                Example prompts:
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {examplePrompts.map(p => (
                                        <button key={p} onClick={() => setPrompt(p)} className="text-xs bg-gray-600 hover:bg-gray-500 px-2 py-1 rounded-md transition-colors">{p}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                     <div className="mt-6 text-center">
                        <button onClick={handleGenerate} disabled={!firstFrame || !prompt} className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-900 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-lg transition-all duration-300 shadow-md">
                            Generate Video
                        </button>
                    </div>
                </div>
            )}
            
            {generatedVideoUrl && !isLoading && (
                 <div className="w-full text-center">
                    <h2 className="text-2xl font-bold text-gray-100 mb-4">Your New Video is Ready!</h2>
                    <video src={generatedVideoUrl} controls autoPlay loop className="w-full max-w-2xl mx-auto rounded-lg shadow-xl mb-6"></video>
                     <div className="flex items-center justify-center space-x-4">
                        <button onClick={reset} className="text-sm text-indigo-400 hover:text-indigo-300">Start Over</button>
                        <a href={generatedVideoUrl} download="enhanced-video.mp4" className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">
                            Download Video
                        </a>
                    </div>
                </div>
            )}
            
            {error && !isLoading && <p className="text-red-400 mt-4 text-center">Error: {error}</p>}
        </div>
    );
};