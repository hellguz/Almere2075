export enum JobStatus {
    PENDING = "pending",
    PROCESSING = "processing",
    THREAT_COMPLETED = "threat_completed",
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
    dataset: string;
    original_image_filename: string;
    original_image_thumb_url?: string;
    threat_image_url: string | null;
    threat_image_thumb_url: string | null;
    threat_prompt_text: string | null;
    threat_tags_used: string[] | null;
    generated_image_url: string | null;
    generated_image_thumb_url?: string; 
    prompt_text: string | null;
    tags_used: string[] | null;
    creator_name: string | null;
    votes: number;
    is_visible: boolean;
    created_at: string;
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
    time?: string; // MODIFIED: Made time optional to align with UI changes
    text: string;
    type: 'info' | 'system' | 'success' | 'error' | 'data';
}

export interface AppState {
    view: 'gallery' | 'transform' | 'comparison' | 'community_gallery';
    dataset: 'weimar' | 'almere';
    comparisonMode: 'slider' | 'side-by-side';
    sourceImageForTransform: SourceImage | null;
    isProcessing: boolean;
    logMessages: LogMessage[];
    jobId: string | null;
    generationDetails: GenerationDetails | null;
    isCommunityItem: boolean;
    showTutorial: boolean;
}