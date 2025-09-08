import { Link } from "react-router";

export const Sidebar = () => {
	return (
		<nav>
			<ul>
				<li>
					<Link
						to={{
							pathname: "/",
						}}
					>
						Home
					</Link>
					<Link
						to={{
							pathname: "/settings",
						}}
					>
						Settings
					</Link>
				</li>
			</ul>
		</nav>
	);
};
