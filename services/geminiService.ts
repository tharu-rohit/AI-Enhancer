
import { GoogleGenAI, Modality } from '@google/genai';
import { VideoGenerationStatus } from '../types';

if (!process.env.API_KEY) {
  console.warn("API_KEY environment variable not set. Video generation will require user-provided key.");
}

export const enhanceImage = async (base64Image: string, mimeType: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                {
                    inlineData: {
                        data: base64Image,
                        mimeType: mimeType,
                    },
                },
                {
                    text: 'Subtly enhance this photo to improve its overall quality, focusing on clarity, color balance, and lighting, without making it look artificial.',
                },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            return part.inlineData.data;
        }
    }
    throw new Error('No enhanced image found in response.');
};


export const generateVideoFromFrame = async (
  prompt: string,
  base64Frame: string,
  aspectRatio: string,
  onProgress: (status: VideoGenerationStatus) => void
): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

    const validAspectRatios = ["16:9", "9:16", "1:1", "4:3", "3:4"];
    const finalAspectRatio = validAspectRatios.includes(aspectRatio) ? aspectRatio : '16:9';

    onProgress({ message: 'Initializing video generation...', progress: 10 });
    let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        image: {
            imageBytes: base64Frame,
            mimeType: 'image/jpeg',
        },
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: finalAspectRatio,
        }
    });

    onProgress({ message: 'Your request is processing. This may take a few minutes.', progress: 30 });

    let pollCount = 0;
    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        onProgress({ message: `AI is creating your video... (${pollCount * 10}s elapsed)`, progress: 50 + pollCount * 5 });
        operation = await ai.operations.getVideosOperation({ operation: operation });
        pollCount++;
    }

    onProgress({ message: 'Finalizing video...', progress: 95 });

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
        throw new Error('Video generation failed or returned no URI.');
    }
    
    const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    if (!videoResponse.ok) {
        throw new Error(`Failed to download video: ${videoResponse.statusText}`);
    }
    
    const videoBlob = await videoResponse.blob();
    const videoUrl = URL.createObjectURL(videoBlob);
    
    onProgress({ message: 'Video generation complete!', progress: 100 });

    return videoUrl;
};
