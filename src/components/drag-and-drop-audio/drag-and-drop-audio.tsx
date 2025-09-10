import React, { useRef, useState, ChangeEvent, DragEvent, useEffect } from "react";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/api/dialog";
import { invoke } from "@tauri-apps/api/tauri";
import { Transcript, TranscriptResponse } from "../../types/transcripts";

interface DragAndDropAudioProps {
	setAudioFilePath: (path: string) => void;
	setTranscriptionData: (data: Transcript) => void;
}

export const DragAndDropAudio = ({ setAudioFilePath, setTranscriptionData }: DragAndDropAudioProps) => {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [modelSize, setModelSize] = useState("medium");
	const [isTranscribing, setIsTranscribing] = useState(false);
	const [progress, setProgress] = useState("");
	const [projectDir, setProjectDir] = useState<string>("");
	const [jsonFilePath, setJsonFilePath] = useState<string>("");

	// --- Event listeners ---
	useEffect(() => {
		let unlistenDone: UnlistenFn;
		let unlistenError: UnlistenFn;
		let unlistenProgress: UnlistenFn;

		(async () => {
			unlistenDone = await listen<string>("whisper-done", (event) => {
				setIsTranscribing(false);
				setProgress("");

				try {
					const projectResponse: TranscriptResponse = JSON.parse(event.payload);
					setProjectDir(projectResponse.project_dir);
					setJsonFilePath(projectResponse.json_file);

					const transcriptionData: Transcript = JSON.parse(projectResponse.transcription);

					// Lift state to parent
					setTranscriptionData(transcriptionData);
					setAudioFilePath(transcriptionData.metadata.copied_file); // MP3 path
				} catch (error) {
					console.error("Failed to parse transcription response:", error);
					alert("Failed to parse transcription response");
				}
			});

			unlistenError = await listen<string>("whisper-error", (event) => {
				setIsTranscribing(false);
				setProgress("");
				alert("Transcription error: " + event.payload);
			});

			unlistenProgress = await listen<string>("whisper-progress", (event) => {
				setProgress(event.payload);
			});
		})();

		return () => {
			unlistenDone?.();
			unlistenError?.();
			unlistenProgress?.();
		};
	}, [setAudioFilePath, setTranscriptionData]);

	const [audioFilePath, setLocalAudioFilePath] = useState<string | null>(null);

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

		setLocalAudioFilePath(path);
		setAudioFilePath(path); // lift to parent
	};

	const handleDrop = (e: DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		handleFiles(e.dataTransfer.files);
	};

	const handleDragOver = (e: DragEvent<HTMLDivElement>) => e.preventDefault();
	const handleClick = () => fileInputRef.current?.click();

	const selectAudioFile = async () => {
		const filePath = await open({
			multiple: false,
			filters: [{ name: "Audio", extensions: ["mp3", "wav", "m4a", "flac"] }],
		});
		if (!filePath) return;

		setLocalAudioFilePath(filePath as string); // local state
		setAudioFilePath(filePath as string); // lift to parent
	};

	const startTranscription = async () => {
		if (!audioFilePath) {
			alert("Please select a file first.");
			return;
		}

		try {
			setIsTranscribing(true);
			setProgress("Starting transcription...");

			// Call Tauri command with the audio file path
			await invoke("run_whisper_project_bg_safe", {
				filepath: audioFilePath,
				modelSize: modelSize,
			});
		} catch (err) {
			console.error("Failed to transcribe audio:", err);
			alert("Failed to transcribe audio.");
			setIsTranscribing(false);
			setProgress("");
		}
	};

	const cancelTranscription = async () => {
		try {
			await invoke("cancel_transcription");
			setProgress("Cancelling...");
		} catch (err) {
			console.error("Failed to cancel transcription:", err);
		}
	};

	const openProjectFolder = async () => {
		if (!projectDir) return;
		try {
			await invoke("open_folder", { path: projectDir });
		} catch (err) {
			console.error("Failed to open folder:", err);
			navigator.clipboard.writeText(projectDir);
			alert(`Project folder path copied to clipboard: ${projectDir}`);
		}
	};

	return (
		<div className="p-6 max-w-4xl mx-auto">
			<div
				onDrop={handleDrop}
				onDragOver={handleDragOver}
				onClick={handleClick}
				className={`mb-6 p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
					isTranscribing ? "border-gray-300 bg-gray-100 cursor-not-allowed" : "border-blue-300 hover:border-blue-400 hover:bg-blue-50"
				}`}
			>
				<div className="space-y-2">
					<div className="text-2xl">🎵</div>
					<div className="text-lg font-medium">Drop audio file here or click to browse</div>
					<div className="text-sm text-gray-600">Supports MP3, WAV, M4A, FLAC</div>
				</div>
			</div>

			<div className="mb-6">
				<button onClick={selectAudioFile} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mr-2" disabled={isTranscribing}>
					Select Audio
				</button>
				<select value={modelSize} onChange={(e) => setModelSize(e.target.value)} className="ml-2 p-2 border rounded" disabled={isTranscribing}>
					<option value="tiny">Tiny</option>
					<option value="base">Base</option>
					<option value="small">Small</option>
					<option value="medium">Medium</option>
					<option value="large">Large</option>
				</select>

				<button
					onClick={startTranscription}
					className="ml-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
					disabled={isTranscribing}
				>
					{isTranscribing ? "Transcribing..." : "Transcribe"}
				</button>

				{isTranscribing && (
					<button onClick={cancelTranscription} className="ml-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
						Cancel
					</button>
				)}

				{projectDir && (
					<button onClick={openProjectFolder} className="ml-2 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600">
						Open Project Folder
					</button>
				)}
			</div>

			{progress && (
				<div className="mb-4 p-3 bg-blue-100 rounded">
					<strong>Status:</strong> {progress}
				</div>
			)}
		</div>
	);
};
