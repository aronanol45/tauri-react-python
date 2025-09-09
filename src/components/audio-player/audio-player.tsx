// src/components/audio-player/audio-player.tsx
import { useContext, useEffect } from "react";
import { AudioContext } from "./audio-player-provider";
export const AudioPlayer = ({ currentTime, audioSrc }: { currentTime: number; audioSrc: string }) => {
	const audioCtx = useContext(AudioContext);
	if (!audioCtx) throw new Error("AudioPlayer must be used inside <AudioProvider>");

	const { audioRef } = audioCtx;

	useEffect(() => {
		if (audioRef.current) {
			audioRef.current.currentTime = currentTime;
		}
	}, [currentTime, audioRef]);

	return (
		<div className="audio-player-wrap">
			<audio ref={audioRef} controls>
				<source type="audio/mp3" src={audioSrc} />
			</audio>
		</div>
	);
};
