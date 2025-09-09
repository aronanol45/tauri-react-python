import { Transcript, WordType } from "../types/transcripts";

export const getErrorsFromText = (text: Transcript) => {
	const errors: WordType[] = [];
	text.map((element) => {
		element.words.map((word) => {
			if (word.confidence < 0.5) {
				errors.push(word);
			}
		});
	});
	return errors;
};
