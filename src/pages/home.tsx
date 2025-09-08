import { useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";

export const Home = () => {
	const [message, setMessage] = useState("");
	const [name, setName] = useState("");

	async function callPython() {
		try {
			const result = await invoke("run_python", { arg: name });
			console.log("Python says:", result);
			setMessage("Python says:" + result);
		} catch (err) {
			console.error("Python error:", err);
			setMessage("Python says:" + err);
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
		</div>
	);
};
