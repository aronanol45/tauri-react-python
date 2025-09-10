import React, { useRef, useState, ChangeEvent, DragEvent, useEffect } from "react";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/api/dialog";
import { invoke } from "@tauri-apps/api/tauri";

interface WordInfo {
	word: string;
	start: number | null;
	end: number | null;
	confidence: number | null;
}

interface Sentence {
	start: number | null;
	end: number | null;
	sentence: string;
	words: WordInfo[];
}

interface TranscriptionMetadata {
	original_file: string;
	copied_file: string;
	model_size: string;
	language: string;
	transcription_date: string;
	device: string;
	compute_type: string;
}

interface TranscriptionData {
	metadata: TranscriptionMetadata;
	transcription: Sentence[];
}

interface ProjectResponse {
	transcription: string;
	project_dir: string;
	json_file: string;
}

export const DragAndDropAudio = () => {
	const [audioFilePath, setAudioFilePath] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [transcription, setTranscription] = useState<string>("");
	const [transcriptionData, setTranscriptionData] = useState<TranscriptionData | null>(null);
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
					// Parse the project response
					const projectResponse: ProjectResponse = JSON.parse(event.payload);
					setProjectDir(projectResponse.project_dir);
					setJsonFilePath(projectResponse.json_file);

					// Parse the transcription data
					const transcriptionData: TranscriptionData = JSON.parse(projectResponse.transcription);
					setTranscriptionData(transcriptionData);

					// Create simple text version for display
					const simpleText = transcriptionData.transcription.map((sentence: Sentence) => sentence.sentence).join(" ");
					setTranscription(simpleText);
				} catch (error) {
					console.error("Failed to parse transcription response:", error);
					// Fallback: treat as plain text
					setTranscription(event.payload);
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
			setIsTranscribing(true);
			setProgress("Starting transcription...");
			setTranscription("");
			setTranscriptionData(null);
			setProjectDir("");
			setJsonFilePath("");

			// Use the NEW safe version
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

	// NEW: Cancel transcription function
	const cancelTranscription = async () => {
		try {
			await invoke("cancel_transcription");
			setProgress("Cancelling...");
		} catch (err) {
			console.error("Failed to cancel transcription:", err);
		}
	};

	const formatTime = (seconds: number | null) => {
		if (seconds === null) return "N/A";
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};

	const openProjectFolder = async () => {
		if (!projectDir) return;
		try {
			await invoke("open_folder", { path: projectDir });
		} catch (err) {
			console.error("Failed to open folder:", err);
			// Fallback: copy path to clipboard
			navigator.clipboard.writeText(projectDir);
			alert(`Project folder path copied to clipboard: ${projectDir}`);
		}
	};

	return (
		<div className="p-6 max-w-4xl mx-auto">
			{/* NEW: Drag and Drop Zone */}
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
					disabled={!audioFilePath || isTranscribing}
				>
					{isTranscribing ? "Transcribing..." : "Transcribe"}
				</button>

				{/* NEW: Cancel Button - only shows when transcribing */}
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

			{audioFilePath && (
				<div className="mb-4 p-3 bg-gray-100 rounded">
					<strong>Selected file:</strong> {audioFilePath.split("/").pop() || audioFilePath.split("\\").pop()}
				</div>
			)}

			{progress && (
				<div className="mb-4 p-3 bg-blue-100 rounded">
					<strong>Status:</strong> {progress}
				</div>
			)}

			{transcriptionData && (
				<div className="mb-6 p-4 border rounded bg-green-50">
					<h3 className="font-bold mb-2">Project Information:</h3>
					<div className="grid grid-cols-2 gap-2 text-sm">
						<div>
							<strong>Original File:</strong> {transcriptionData.metadata.original_file}
						</div>
						<div>
							<strong>Language:</strong> {transcriptionData.metadata.language}
						</div>
						<div>
							<strong>Model:</strong> {transcriptionData.metadata.model_size}
						</div>
						<div>
							<strong>Device:</strong> {transcriptionData.metadata.device}
						</div>
						<div>
							<strong>Date:</strong> {new Date(transcriptionData.metadata.transcription_date).toLocaleString()}
						</div>
						<div>
							<strong>Project Dir:</strong> {projectDir}
						</div>
					</div>
				</div>
			)}

			{transcription && (
				<div className="mt-4 p-4 border rounded bg-gray-50">
					<h3 className="font-bold mb-2">Transcription:</h3>
					<div className="bg-white p-3 rounded border">{transcription}</div>
				</div>
			)}

			{transcriptionData && transcriptionData.transcription.length > 0 && (
				<div className="mt-6">
					<h3 className="font-bold mb-4">Detailed Transcription with Timestamps:</h3>
					<div className="space-y-3">
						{transcriptionData.transcription.map((sentence, index) => (
							<div key={index} className="border rounded p-3 bg-white">
								<div className="text-sm text-gray-600 mb-2">
									{formatTime(sentence.start)} - {formatTime(sentence.end)}
								</div>
								<div className="mb-2">{sentence.sentence}</div>
								<div className="text-xs text-gray-500">
									Words: {sentence.words.length} | Avg Confidence:{" "}
									{sentence.words.length > 0
										? ((sentence.words.reduce((sum, word) => sum + (word.confidence || 0), 0) / sentence.words.length) * 100).toFixed(1) +
										  "%"
										: "N/A"}
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
};
