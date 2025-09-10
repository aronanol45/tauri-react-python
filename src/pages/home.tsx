import { useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { AudioRecorder } from "../components/audio-recorder/audio-recorder";
import { AudioTextWrapper } from "../components/audio-text-wrapper/audio-text-wrapper";
import { DragAndDropAudio } from "../components/drag-and-drop-audio/drag-and-drop-audio";
import { Transcript } from "../types/transcripts";

export const Home = () => {
	const [message, setMessage] = useState("");
	const [name, setName] = useState("");

	// New state to hold current transcription and audio
	const [audioFilePath, setAudioFilePath] = useState<string>("");
	const [transcriptionData, setTranscriptionData] = useState<Transcript | null>(null);

	async function callPython() {
		try {
			const result = await invoke("run_python", { name: name });
			if (typeof result === "string") {
				const parsed = JSON.parse(result);
				setMessage("Success says: " + parsed?.message);
			} else {
				console.error("Unexpected result type:", result);
				setMessage("Error: Unexpected result type");
			}
		} catch (err) {
			console.error(" error:", err);
			setMessage("Error says:" + err);
		}
	}

	return (
		<div>
			<h1>Home</h1>
			<form
				className="row"
				onSubmit={(e) => {
					e.preventDefault();
					callPython();
				}}
			>
				<input id="greet-input" onChange={(e) => setName(e.currentTarget.value)} placeholder="Enter a name..." />
				<button type="submit">Greet</button>
			</form>
			<p>{message}</p>
			<DragAndDropAudio setAudioFilePath={setAudioFilePath} setTranscriptionData={setTranscriptionData} />
			{audioFilePath && transcriptionData && <AudioTextWrapper audioSrc={audioFilePath} textData={transcriptionData} />}
		</div>
	);
};
