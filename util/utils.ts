import axios from 'axios';

export function getId(linkOrId: string): string {
	if (/^https?:\/\/(www.)?youtube.com\/watch\?v=.*/.test(linkOrId)) {
		return linkOrId.split('?v=')[1];
	} else {
		return linkOrId;
	}
}

export function isTrack(track: Track | PlaceholderTrack): track is Track {
	return !('placeholder' in track);
}

export function isPlaceholder(track: Track | PlaceholderTrack): track is PlaceholderTrack {
	return 'placeholder' in track;
}

export function updateLocalStorage(tracks: (Track | PlaceholderTrack)[]): void {
	localStorage.setItem('music-player:tracks', JSON.stringify(tracks.map((track) => ('placeholder' in track ? track : track.toRaw()))));
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

export class Track implements RawTrack {
	private audio: HTMLAudioElement;

	constructor(public video: Video, private _vol: number = 100, public startTime: number = 0) {
		this.audio = new Audio();
		this.audio.currentTime = this.startTime;
		this.audio.volume = _vol / 100;
		axios.get<Blob>(video.audio, { responseType: 'blob' }).then((res) => {
			this.audio.src = URL.createObjectURL(res.data);
		});
	}

	public set vol(vol: number) {
		this.audio.volume = vol / 100;
		this._vol = vol;
	}

	public get vol(): number {
		return this._vol;
	}

	public play(): void {
		this.audio.currentTime = this.startTime;
		this.audio.play();
	}

	public pause(): void {
		this.audio.pause();
	}

	public resume(): void {
		this.audio.play();
	}

	public isPlaying(): boolean {
		return !this.audio.paused;
	}

	public wasPlaying(): boolean {
		return this.audio.currentTime > this.startTime;
	}

	public onEnd(listener: () => void): () => void {
		this.audio.addEventListener('ended', listener);

		return () => {
			this.audio.removeEventListener('ended', listener);
		};
	}

	public serialize(): string {
		return JSON.stringify({ video: this.video, vol: this._vol, startTime: this.startTime });
	}

	public toRaw(): RawTrack {
		return {
			video: this.video,
			vol: this._vol,
			startTime: this.startTime
		};
	}

	public static deserialize(serialized: string): Track {
		const raw = JSON.parse(serialized) as RawTrack;
		return new Track(raw.video, raw.vol, raw.startTime);
	}

	public static fromRaw(raw: RawTrack): Track {
		return new Track(raw.video, raw.vol, raw.startTime);
	}
}
