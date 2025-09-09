import { WordType } from "../../types/transcripts";

interface ErrorsNavigatorProps {
	confidenceErrors: WordType[];
}

export const ErrorsNavigator = ({ confidenceErrors }: ErrorsNavigatorProps) => {
	const prevError = () => {
		alert("go to prev error");
	};
	const nextError = () => {
		alert("go to next error");
	};
	return (
		<div className="errors-navigator">
			<span>{confidenceErrors.length}</span>
			<div className="buttons-container">
				<button onClick={prevError}>Prev</button>
				<button onClick={nextError}>Next</button>
			</div>
		</div>
	);
};
