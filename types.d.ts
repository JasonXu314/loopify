type Canceler = import('axios').Canceler;

interface Video {
	_id: string;
	url: string;
	audio: string;
	thumb: string;
	title: string;
	duration: string;
}

interface RawTrack {
	video: Video;
	vol: number = 100;
	startTime: number = 0;
}

interface PlaceholderTrack {
	placeholder: true;
	id: string;
	cancel: Canceler;
}
