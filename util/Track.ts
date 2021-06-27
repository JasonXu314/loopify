import axios from 'axios';
import AudioLoader from './AudioLoader';
import { timeStringToSeconds } from './utils';

export default class Track implements RawTrack {
	private audio: HTMLAudioElement;
	private tickListener: (evt: Event) => void;
	public length: number;
	public loaded: boolean;

	constructor(
		public video: Video,
		public audioLoader: AudioLoader,
		private _vol: number = 100,
		public startTime: number = 0,
		public endTime: number = timeStringToSeconds(video.duration)
	) {
		this.loaded = false;
		this.audio = new Audio();
		this.audio.currentTime = this.startTime;
		this.audio.volume = _vol / 100;
		this.length = timeStringToSeconds(video.duration);
		this.tickListener = () => {
			if (this.audio.currentTime >= this.endTime && this.audio.currentTime < this.length) {
				this.audio.currentTime = this.length;
			}
		};
		audioLoader.load(video.audio).then((res) => {
			this.audio.src = URL.createObjectURL(res);
			this.loaded = true;
		});
		if (video.author === undefined || video.description === undefined) {
			axios.post<Video>('/api/load', { id: video._id }).then((res) => {
				this.video.author = res.data.author;
				this.video.description = res.data.description;
			});
		}
		this.audio.addEventListener('timeupdate', this.tickListener);

		if (video.audio.startsWith('https://loopify-backend.herokuapp.com/audio')) {
			this.video.audio = `https://loopify.vercel.app/api/audio/${video._id}`;
		}
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
		return JSON.stringify({ video: this.video, vol: this._vol, startTime: this.startTime, endTime: this.endTime });
	}

	public toRaw(): RawTrack {
		return {
			video: this.video,
			vol: this._vol,
			startTime: this.startTime,
			endTime: this.endTime
		};
	}

	public prioritize(): void {
		this.audioLoader.prioritize(this.video.audio);
	}

	public static deserialize(serialized: string, audioLoader: AudioLoader): Track {
		const raw = JSON.parse(serialized) as OldRawTrack;
		return new Track(raw.video, audioLoader, raw.vol, raw.startTime, raw.endTime);
	}

	public static fromRaw(raw: OldRawTrack, audioLoader: AudioLoader): Track {
		return new Track(raw.video, audioLoader, raw.vol, raw.startTime, raw.endTime);
	}
}
