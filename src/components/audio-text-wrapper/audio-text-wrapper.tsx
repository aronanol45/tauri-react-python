import { useEffect, useState } from "react";
import { AudioPlayer } from "../audio-player/audio-player";
import { AudioProvider } from "../audio-player/audio-player-provider";
import { TextEditor } from "../text-editor/text-editor";

import mockedUpData from "./mockup.json";
import audioFile from "./test.mp3";
import { getErrorsFromText } from "../../utils/getErrorsFromText";
import { ErrorsNavigator } from "../errors-navigator/errors-navigator";
import { Transcript, WordType } from "../../types/transcripts";

export const AudioTextWrapper = () => {
	const [errorsConfidence, setErrorsConfidence] = useState<WordType[]>([]);

	useEffect(() => {
		const errors: WordType[] = getErrorsFromText(mockedUpData);
		setErrorsConfidence(errors);
	}, [mockedUpData as Transcript]);

	return (
		<div>
			<AudioProvider>
				<div className="sticky-top-bar">
					<AudioPlayer currentTime={0} audioSrc={audioFile} />
					<ErrorsNavigator confidenceErrors={errorsConfidence} />
				</div>
				<TextEditor textData={mockedUpData} />
			</AudioProvider>
		</div>
	);
};
