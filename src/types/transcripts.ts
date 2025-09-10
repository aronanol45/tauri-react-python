export interface WordType {
	word: string;
	start: number;
	end: number;
	confidence: number;
}

export interface SentenceType {
	start: number;
	end: number;
	sentence: string;
	words: WordType[];
}

export interface TranscriptResponse {
	transcription: string; // the JSON stringified transcription
	project_dir: string; // folder path where MP3 & JSON are saved
	json_file: string; // full path to transcript.json
}

export type Transcript = SentenceType[];
