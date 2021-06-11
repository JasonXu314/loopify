import { useEffect, useMemo, useState } from 'react';
import { rawNumberToTime, timeStringToSeconds, Track } from '../../util/utils';
import styles from './VideoTile.module.scss';

interface Props {
	track: Track;
	playing: boolean;
	onPause(): void;
	onPlay(): void;
	onResume(): void;
	updateLocalStorage(): void;
}

const VideoTile: React.FC<Props> = ({ track, playing, onPause, onResume, onPlay, updateLocalStorage }) => {
	const [vol, setVol] = useState<number>(track.vol);
	const [startTime, setStartTime] = useState<number>(track.startTime);
	const [eagerStartTime, setEagerStartTime] = useState<string | null>(null);
	const length = useMemo(() => timeStringToSeconds(track.video.duration), [track.video.duration]);

	useEffect(() => {
		track.vol = vol;
		updateLocalStorage();
	}, [track, vol, updateLocalStorage]);

	useEffect(() => {
		track.startTime = startTime;
		updateLocalStorage();
	}, [track, startTime, updateLocalStorage]);

	return (
		<div className={styles.main}>
			<div className={styles.left}>
				<img src={track.video.thumb} />
				<h4>
					{track.video.title.replaceAll(/\\u.{4}/g, (str) => {
						return String.fromCodePoint(parseInt(str.slice(2), 16));
					})}
				</h4>
				<button
					onClick={() => {
						if (track.isPlaying()) {
							track.pause();
							onPause();
						} else if (track.wasPlaying()) {
							track.resume();
							onResume();
						} else {
							track.play();
							onPlay();
						}
					}}>
					{playing ? 'Pause' : 'Play'}
				</button>
			</div>
			<div className={styles.right}>
				<div>
					<h4>Start Time</h4>
					<input
						type="range"
						max={length}
						min="0"
						value={startTime}
						onChange={(evt) => {
							setStartTime(parseInt(evt.target.value));
						}}
					/>
					<input
						value={eagerStartTime || rawNumberToTime(startTime)}
						onChange={(evt) => {
							setEagerStartTime(evt.target.value);
						}}
						onBlur={() => {
							try {
								const newStartTime = timeStringToSeconds(eagerStartTime!);

								if (newStartTime > length) {
									setEagerStartTime(null);
								} else {
									setStartTime(newStartTime);
									setEagerStartTime(null);
								}
							} catch (err) {
								setEagerStartTime(null);
							}
						}}
					/>
				</div>
				<div>
					<h4>Volume</h4>
					<input
						type="range"
						max="100"
						min="0"
						value={vol}
						onChange={(evt) => {
							setVol(parseInt(evt.target.value));
						}}
					/>
				</div>
			</div>
		</div>
	);
};

export default VideoTile;
