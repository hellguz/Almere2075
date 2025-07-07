export enum JobStatus {
    PENDING = "pending",
    PROCESSING = "processing",
    COMPLETED = "completed",
    FAILED = "failed",
}

export interface Tag {
    id: string;
    name: string;
    description: string;
}

export interface GenerationDetails {
    id: string;
    status: JobStatus;
    dataset: string; // ADDED: To know if it's 'weimar' or 'almere'
    original_image_filename: string;
    // ADDED: The path to the thumbnail of the original image.
    original_image_thumb_url?: string;
    generated_image_url: string | null;
    // ADDED: The path to the thumbnail of the generated image.
    generated_image_thumb_url?: string;
    prompt_text: string | null;
    tags_used: string[] | null;
    creator_name: string | null;
    votes: number;
    is_visible: boolean;
    created_at: string; // ISO date string
}

export interface GalleryImage {
    filename: string;
    thumbnail: string;
}

export interface GamificationStats {
    happiness_score: number;
    target_score: number;
    deadline_iso: string;
}

export interface SourceImage {
    url: string;
    name: string;
}

export interface LogMessage {
    time: string;
    text: string;
    type: 'info' | 'system' | 'success' | 'error' | 'data';
}

export interface AppState {
    view: 'gallery' | 'transform' | 'comparison' | 'community_gallery';
    dataset: 'weimar' | 'almere'; // ADDED
    comparisonMode: 'slider' | 'side-by-side';
    sourceImageForTransform: SourceImage | null;
    isProcessing: boolean;
    logMessages: LogMessage[];
    jobId: string | null;
    generationDetails: GenerationDetails | null;
    isCommunityItem: boolean;
    showTutorial: boolean;
}



