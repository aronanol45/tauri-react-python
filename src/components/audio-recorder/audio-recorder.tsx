import { useAudioRecorder } from "./hooks/useAudioRecorder";

export const AudioRecorder = () => {
	const { recording, startRecording, stopRecording } = useAudioRecorder(10000);
	return (
		<div>
			<h2>Audio Recorder</h2>
			<p>Status: {recording ? "Recording..." : "Stopped"}</p>
			<button onClick={startRecording} disabled={recording}>
				Start Recording
			</button>
			<button onClick={stopRecording} disabled={!recording}>
				Stop Recording
			</button>
		</div>
	);
};
