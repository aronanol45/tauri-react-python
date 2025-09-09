import { FocusEvent, useCallback, useState } from "react";
import sanitizeHtml from "sanitize-html";
import { WordType } from "../../types/transcripts";

interface WordProps {
	word: WordType;
}

export const Word = ({ word }: WordProps) => {
	const [content, setContent] = useState("");
	const onContentBlur = useCallback((evt: FocusEvent<HTMLSpanElement>) => {
		const sanitizeConf = {
			allowedTags: ["b", "i", "a", "p"],
			allowedAttributes: { a: ["href"] },
		};

		setContent(sanitizeHtml(evt.currentTarget.innerHTML, sanitizeConf));
	}, []);

	return (
		<span contentEditable onBlur={onContentBlur} dangerouslySetInnerHTML={{ __html: content }}>
			{word.word}
		</span>
	);
};
