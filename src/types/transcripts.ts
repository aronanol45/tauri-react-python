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

export type Transcript = SentenceType[];
