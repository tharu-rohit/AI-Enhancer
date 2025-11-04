
export enum EnhancementMode {
  Photo = 'photo',
  Video = 'video',
}

export interface VideoGenerationStatus {
  message: string;
  progress: number;
}
