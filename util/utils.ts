import Track from './Track';

export function getId(linkOrId: string): string {
	if (/^https?:\/\/(www\.|m\.)?youtube.com\/watch\?v=[a-zA-Z0-9\-_]{11}$/.test(linkOrId)) {
		return linkOrId.split('?v=')[1];
	} else if (/^[a-zA-Z0-9\-_]{11}$/.test(linkOrId)) {
		return linkOrId;
	} else {
		throw new Error('Not a YouTube link or video ID');
	}
}

export function isTrack(track: Track | PlaceholderTrack): track is Track {
	return !('placeholder' in track);
}

export function isPlaceholder(track: Track | PlaceholderTrack): track is PlaceholderTrack {
	return 'placeholder' in track;
}

export function updateLocalStorage(tracks: (Track | PlaceholderTrack)[]): void {
	localStorage.setItem(
		'music-player:tracks',
		JSON.stringify(
			tracks
				.map((track) => ('placeholder' in track ? (track.id !== null ? { placeholder: true, id: track.id } : undefined) : track.toRaw()))
				.filter((track) => track !== undefined)
		)
	);
}

export function padNum(num: number): string {
	return num.toString().length < 2 ? '0' + num : num.toString();
}

export function rawNumberToTime(time: number): string {
	const hours = Math.floor(time / 3600);
	const minutes = Math.floor((time % 3600) / 60);
	const seconds = time % 60;

	return `${padNum(hours)}:${padNum(minutes)}:${padNum(seconds)}`;
}

export function timeStringToSeconds(time: string): number {
	if (!/^\d{2}:\d{2}:\d{2}$/.test(time)) {
		throw new Error('Time formatted incorrectly; must be in form HH:MM:SS');
	}
	const [hours, minutes, seconds] = time.split(':').map((time) => parseInt(time));

	return hours * 3600 + minutes * 60 + seconds;
}

export function handleSpecial(str: string): string {
	return str.replaceAll(/\\u.{4}/g, (str) => {
		return String.fromCodePoint(parseInt(str.slice(2), 16));
	});
}
