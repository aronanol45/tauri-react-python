import React, { createContext, useRef, useEffect, useState, ReactNode } from "react";

interface AudioContextType {
	audioRef: React.RefObject<HTMLAudioElement | null>; // allow null
	currentTime: number;
	setCurrentTime: (time: number) => void;
	seekTo: (time: number) => void;
}

export const AudioContext = createContext<AudioContextType | null>(null);

export function AudioProvider({ children }: { children: ReactNode }) {
	const audioRef = useRef<HTMLAudioElement>(null);
	const [currentTime, setCurrentTime] = useState(0);

	useEffect(() => {
		const audio = audioRef.current;
		if (!audio) return;

		const updateTime = () => setCurrentTime(audio.currentTime);
		audio.addEventListener("timeupdate", updateTime);
		return () => audio.removeEventListener("timeupdate", updateTime);
	}, []);

	const seekTo = (time: number) => {
		if (audioRef.current) {
			audioRef.current.currentTime = time;
			audioRef.current.play(); // optional: auto play after seek
		}
	};

	return <AudioContext.Provider value={{ audioRef, currentTime, setCurrentTime, seekTo }}>{children}</AudioContext.Provider>;
}
