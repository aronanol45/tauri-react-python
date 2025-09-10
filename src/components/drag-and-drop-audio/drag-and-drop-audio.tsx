import React, { useRef, useState, ChangeEvent, DragEvent, useEffect } from "react";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/api/dialog";
import { invoke } from "@tauri-apps/api/tauri";

export const DragAndDropAudio = () => {
	const [audioFilePath, setAudioFilePath] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [transcription, setTranscription] = useState<string>("");
	const [modelSize, setModelSize] = useState("medium");

	// --- Event listeners ---
	useEffect(() => {
		let unlistenDone: UnlistenFn;
		let unlistenError: UnlistenFn;

		(async () => {
			unlistenDone = await listen<string>("whisper-done", (event) => {
				setTranscription(event.payload);
			});

			unlistenError = await listen<string>("whisper-error", (event) => {
				alert("Transcription error: " + event.payload);
			});
		})();

		return () => {
			unlistenDone?.();
			unlistenError?.();
		};
	}, []);

	const handleFiles = (files: FileList) => {
		const file = files[0];
		if (!file.type.startsWith("audio/")) {
			alert("Please select an audio file.");
			return;
		}

		// @ts-ignore
		const path = file.path;
		if (!path) {
			alert("Cannot read file path. Use Tauri file dialog or drag-and-drop.");
			return;
		}

		setAudioFilePath(path);
	};

	const handleDrop = (e: DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		handleFiles(e.dataTransfer.files);
	};

	const handleDragOver = (e: DragEvent<HTMLDivElement>) => e.preventDefault();
	const handleClick = () => fileInputRef.current?.click();
	const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
		if (e.target.files) handleFiles(e.target.files);
	};

	const selectAudioFile = async () => {
		const filePath = await open({
			multiple: false,
			filters: [{ name: "Audio", extensions: ["mp3", "wav", "m4a", "flac"] }],
		});
		if (!filePath) return;
		setAudioFilePath(filePath as string);
	};

	const startTranscription = async () => {
		if (!audioFilePath) {
			alert("Please select a file first.");
			return;
		}

		try {
			// Trigger background transcription without passing cyclic objects
			await invoke("run_whisper_proto_bg", {
				filepath: audioFilePath,
				modelSize: modelSize,
			});
		} catch (err) {
			console.error("Failed to transcribe audio:", err);
			alert("Failed to transcribe audio.");
		}
	};

	return (
		<div>
			<button onClick={selectAudioFile} className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
				Select Audio
			</button>
			<input type="file" accept="audio/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
			<select value={modelSize} onChange={(e) => setModelSize(e.target.value)} className="ml-2 p-1 border rounded">
				<option value="tiny">Tiny</option>
				<option value="base">Base</option>
				<option value="small">Small</option>
				<option value="medium">Medium</option>
				<option value="large">Large</option>
			</select>
			<button onClick={startTranscription} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
				Transcribe
			</button>

			{transcription && (
				<div className="mt-4 p-4 border rounded bg-gray-50">
					<h3 className="font-bold">Transcription:</h3>
					<pre>{transcription}</pre>
				</div>
			)}
		</div>
	);
};
