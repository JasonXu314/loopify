import { Button, Slider } from '@mantine/core';
import { useEffect, useState } from 'react';
import { DraggableProvidedDragHandleProps } from 'react-beautiful-dnd';
import Track from '../../util/Track';
import { handleSpecial, rawNumberToTime, timeStringToSeconds } from '../../util/utils';
import DragIcon from '../DragIcon/DragIcon';
import Input from '../Input/Input';
import TrashCan from '../TrashCan/TrashCan';
import styles from './VideoTile.module.scss';

interface Props {
	track: Track;
	playing: boolean;
	dragProps?: DraggableProvidedDragHandleProps;
	del(): void;
	onPlay(): void;
	onPause(): void;
	updateLocalStorage(): void;
}

const VideoTile: React.FC<Props> = ({ track, playing, dragProps, onPause, onPlay, updateLocalStorage, del }) => {
	const [vol, setVol] = useState<number>(track.vol);
	const [startTime, setStartTime] = useState<number>(track.startTime);
	const [eagerStartTime, setEagerStartTime] = useState<string | null>(null);
	const [endTime, setEndTime] = useState<number>(track.endTime);
	const [eagerEndTime, setEagerEndTime] = useState<string | null>(null);

	useEffect(() => {
		track.vol = vol;
		updateLocalStorage();
	}, [track, vol, updateLocalStorage]);

	useEffect(() => {
		track.startTime = startTime;
		updateLocalStorage();
	}, [track, startTime, updateLocalStorage]);

	useEffect(() => {
		track.endTime = endTime;
		updateLocalStorage();
	}, [track, endTime, updateLocalStorage]);

	return (
		<div className={styles.main}>
			<div className={styles.left}>
				<div className={styles.thumb}>
					<img src={track.video.thumb} />
				</div>
				<a className={styles.link} href={`https://www.youtube.com/watch?v=${track.video._id}`} rel="noopener noreferrer" target="_blank">
					<h4>{handleSpecial(track.video.title)}</h4>
				</a>
				<p>Length: {track.video.duration}</p>
				<Button
					onClick={() => {
						if (track.isPlaying()) {
							onPause();
							track.pause();
						} else if (track.wasPlaying()) {
							onPlay();
							track.resume();
						} else {
							if (!track.loaded) {
								track.prioritize();
							}
							onPlay();
							track.play();
						}
					}}>
					{playing ? 'Pause' : 'Play'}
				</Button>
			</div>
			<div className={styles.right}>
				<div className={styles.col}>
					<h4>Start Time</h4>
					<Slider
						label={(value) => rawNumberToTime(value)}
						max={track.length}
						min={0}
						value={startTime}
						onChange={(newStartTime) => {
							if (newStartTime < endTime) {
								setStartTime(newStartTime);
							}
						}}
					/>
					<Input
						value={eagerStartTime || rawNumberToTime(startTime)}
						onChange={(evt) => {
							setEagerStartTime(evt.target.value);
						}}
						label="Start Time"
						onBlur={() => {
							try {
								const newStartTime = timeStringToSeconds(eagerStartTime!);

								if (newStartTime > track.length || newStartTime >= endTime) {
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
					<h4>End Time</h4>
					<Slider
						label={(value) => rawNumberToTime(value)}
						max={track.length}
						min={0}
						value={endTime}
						onChange={(newEndTime) => {
							if (newEndTime > startTime) {
								setEndTime(newEndTime);
							}
						}}
					/>
					<Input
						value={eagerEndTime || rawNumberToTime(endTime)}
						onChange={(evt) => {
							setEagerEndTime(evt.target.value);
						}}
						label="End Time"
						onBlur={() => {
							try {
								const newEndTime = timeStringToSeconds(eagerEndTime!);

								if (newEndTime > track.length || newEndTime <= startTime) {
									setEagerEndTime(null);
								} else {
									setEndTime(newEndTime);
									setEagerEndTime(null);
								}
							} catch (err) {
								setEagerEndTime(null);
							}
						}}
					/>
				</div>
				<div className={styles.col}>
					<h4>Volume</h4>
					<Slider
						max={100}
						min={0}
						value={vol}
						onChange={(newVol) => {
							setVol(newVol);
						}}
					/>
				</div>
			</div>
			<TrashCan className={styles.del} onClick={del} />
			<DragIcon className={styles.drag} dragProps={dragProps} />
		</div>
	);
};

export default VideoTile;
