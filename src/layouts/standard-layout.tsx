import { Outlet } from "react-router";
import { Sidebar } from "../components/navigation/sidebar/sidebar";
export const StandardLayout = () => {
	return (
		<div>
			<h1>Layout</h1>
			<Sidebar />
			<Outlet />
		</div>
	);
};
