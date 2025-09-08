// src/hooks/useAudioRecorder.js
import { useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/tauri";

export function useAudioRecorder(chunkTime = 10000) {
	const [recording, setRecording] = useState(false);
	const mediaRecorderRef = useRef(null);

	const startRecording = async () => {
		const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
		mediaRecorderRef.current = new MediaRecorder(stream);

		mediaRecorderRef.current.ondataavailable = (e) => {
			if (e.data.size > 0) {
				sendAudioChunk(e.data);
			}
		};

		mediaRecorderRef.current.start(chunkTime);
		setRecording(true);
	};

	const stopRecording = () => {
		mediaRecorderRef.current.stop();
		setRecording(false);
	};

	const sendAudioChunk = async (blob) => {
		try {
			const arrayBuffer = await blob.arrayBuffer();
			const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
			const res = await invoke("process_audio_chunk", { audioData: base64Audio })
				.then((res) => console.log("Python response:", res))
				.catch((err) => console.error(err));
			console.log("Python says:", res);
		} catch (err) {
			console.error("Python error:", err);
		}
	};

	return { recording, startRecording, stopRecording };
}
