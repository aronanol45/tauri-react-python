import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import "./App.css";
import { createBrowserRouter } from "react-router";
import { Home } from "./pages/home";
import { Settings } from "./pages/settings";
import { RouterProvider } from "react-router/dom";
import { StandardLayout } from "./layouts/standard-layout";

const router = createBrowserRouter([
	{
		Component: StandardLayout,
		children: [
			{ index: true, Component: Home },
			{
				path: "/settings",
				Component: Settings,
			},
		],
	},
]);

function PreloadScreen({ onReady }: { onReady: () => void }) {
	useEffect(() => {
		async function setup() {
			// Example: check for updates
			const update = await invoke("check_for_updates");
			console.log("Update status:", update);

			const config = await invoke("load_config");
			console.log("Config loaded:", config);

			onReady();
		}

		setup();
	}, [onReady]);

	return (
		<div className="flex h-screen items-center justify-center">
			<div className="text-xl animate-pulse">Loading, please wait…</div>
		</div>
	);
}

function App() {
	/*
  // call rust backend
	async function greet() {
		setGreetMsg(await invoke("greet", { name }));
	}
  */

	const [ready, setReady] = useState(true);

	if (!ready) {
		return <PreloadScreen onReady={() => setReady(true)} />;
	}

	return <RouterProvider router={router} />;
}

export default App;
