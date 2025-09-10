import React, { useRef, useState, ChangeEvent, DragEvent } from "react";

export const DragAndDropAudio = () => {
	const [audioFile, setAudioFile] = useState<File | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleFiles = (files: FileList) => {
		const file = files[0];
		if (file && file.type.startsWith("audio/")) {
			setAudioFile(file);
			console.log("Selected file:", file);
		} else {
			alert("Please upload a valid audio file.");
		}
	};

	const handleDrop = (e: DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		handleFiles(e.dataTransfer.files);
	};

	const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
	};

	const handleClick = () => {
		fileInputRef.current?.click();
	};

	const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
		if (e.target.files) {
			handleFiles(e.target.files);
		}
	};

	return (
		<div>
			<div
				className="border-2 border-dashed border-gray-400 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
				onClick={handleClick}
				onDrop={handleDrop}
				onDragOver={handleDragOver}
			>
				{audioFile ? <p>Selected file: {audioFile.name}</p> : <p>Drag & drop an audio file here, or click to select</p>}
			</div>
			<input type="file" accept="audio/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
		</div>
	);
};
