// src/hooks/useAudioRecorder.js
import { useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/tauri";

export function useAudioRecorder(chunkTime = 10000) {
	const [recording, setRecording] = useState(false);
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);

	const startRecording = async () => {
		const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
		mediaRecorderRef.current = new MediaRecorder(stream) as MediaRecorder; // webm by default
		//mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: "audio/wav" });

		mediaRecorderRef.current.ondataavailable = (e) => {
			if (e.data.size > 0) {
				sendAudioChunk(e.data);
			}
		};

		mediaRecorderRef.current.start(chunkTime);
		setRecording(true);
	};

	const stopRecording = () => {
		mediaRecorderRef.current?.stop();
		setRecording(false);
	};

	const sendAudioChunk = async (blob: Blob) => {
		try {
			const arrayBuffer = await blob.arrayBuffer();
			// Convert ArrayBuffer to Base64 safely
			const base64Audio = arrayBufferToBase64(arrayBuffer);
			console.log("base64AudioToSend", base64Audio);
			const res = await invoke("process_audio_chunk", { payload: base64Audio });
			console.log("Python response:", res);
		} catch (err) {
			console.error("Python error:", err);
		}
	};

	// Helper: ArrayBuffer → Base64
	function arrayBufferToBase64(buffer: ArrayBuffer) {
		let binary = "";
		const bytes = new Uint8Array(buffer);
		const chunkSize = 0x8000; // 32 KB chunks to avoid stack overflow
		for (let i = 0; i < bytes.length; i += chunkSize) {
			const chunk = bytes.subarray(i, i + chunkSize);
			binary += String.fromCharCode(...chunk);
		}
		return btoa(binary);
	}

	return { recording, startRecording, stopRecording };
}
