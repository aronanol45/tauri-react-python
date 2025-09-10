import { useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { AudioRecorder } from "../components/audio-recorder/audio-recorder";
import { AudioTextWrapper } from "../components/audio-text-wrapper/audio-text-wrapper";
import { DragAndDropAudio } from "../components/drag-and-drop-audio/drag-and-drop-audio";

export const Home = () => {
	const [message, setMessage] = useState("");
	const [name, setName] = useState("");

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
			<DragAndDropAudio />
			<AudioTextWrapper />
			<AudioRecorder />
		</div>
	);
};
