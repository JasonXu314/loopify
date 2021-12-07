type Canceler = import('axios').Canceler;

type OldRawTrack = Pick<RawTrack, 'video' | 'vol' | 'startTime'> & Partial<RawTrack>;

interface VideoInfo {
	player_response: {
		videoDetails: {
			title: string;
			shortDescription: string;
			author: string;
			lengthSeconds: string;
		};
	};
}

interface Video {
	_id: string;
	url: string;
	audio: string;
	thumb: string;
	title: string;
	duration: string;
	author: string;
	description: string;
}

interface RawTrack {
	video: Video;
	vol: number = 100;
	startTime: number = 0;
	endTime: number;
}

interface PlaceholderTrack {
	placeholder: true;
	id: string | null;
	cancel: Canceler | null;
}
