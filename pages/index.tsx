import axios from 'axios';
import Head from 'next/head';
import { NextPage } from 'next/types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Button from '../components/Button/Button';
import Input from '../components/Input/Input';
import PlaceholderTile from '../components/PlaceholderTile/PlaceholderTile';
import VideoTile from '../components/VideoTile/VideoTile';
import styles from '../sass/Index.module.scss';
import AudioLoader from '../util/AudioLoader';
import Track from '../util/Track';
import { getId, isPlaceholder, isTrack, updateLocalStorage } from '../util/utils';

const Index: NextPage = () => {
	const [newId, setNewId] = useState<string>('');
	const [tracks, setTracks] = useState<(Track | PlaceholderTrack)[]>([]);
	const [playIdx, setPlayIdx] = useState<number | null>(null);
	const [progressing, setProgressing] = useState<boolean>(false);
	const [paused, setPaused] = useState<boolean>(true);
	const [tooLong, setTooLong] = useState<boolean>(false);
	const placeholders = useMemo(() => tracks.filter<PlaceholderTrack>(isPlaceholder), [tracks]);
	const audioLoader = useMemo(() => new AudioLoader(), []);
	const audio = useRef<Track | null>(playIdx !== null ? (tracks[playIdx] as Track) : null);
	const listRef = useRef<HTMLDivElement | null>(null);
	const mainRef = useRef<HTMLDivElement | null>(null);
	const controlRef = useRef<HTMLDivElement | null>(null);
	// const startY = useRef<number | null>(null);
	// const changeIdx = useRef<number | null>(null);
	// const tracksRef = useRef<(Track | PlaceholderTrack)[] | null>(null);

	const fetchVideo = useCallback(
		(id: string) => {
			const { token, cancel } = axios.CancelToken.source();
			axios.post<Video>(`${process.env.NEXT_PUBLIC_BACKEND_URL!}/load`, { id }, { cancelToken: token }).then((res) => {
				const video = res.data;
				const track = new Track(video, audioLoader);
				setTracks((tracks) =>
					tracks.map((oldTrack) => {
						if ('placeholder' in oldTrack) {
							return oldTrack.id === video._id ? track : oldTrack;
						}
						return oldTrack;
					})
				);
			});

			return cancel;
		},
		[audioLoader]
	);

	useEffect(() => {
		if (listRef.current && mainRef.current && controlRef.current) {
			const listHeight = Number(getComputedStyle(listRef.current).height.slice(0, -2));
			const mainHeight = Number(getComputedStyle(mainRef.current).height.slice(0, -2));
			const em = Number(getComputedStyle(controlRef.current).marginBottom.slice(0, -2));
			const controlHeight = Number(getComputedStyle(controlRef.current).height.slice(0, -2)) + em + 0.2 * em;

			if (listHeight >= mainHeight - controlHeight - 1) {
				setTooLong(true);
			}
		}
	}, [tracks]);

	const addLink = useCallback(
		(newLink) => {
			if (newLink !== '') {
				try {
					const id = getId(newLink);

					const cancel = fetchVideo(id);

					setTracks((tracks) => [...tracks, { placeholder: true, id, cancel }]);
					setNewId('');
				} catch (err) {
					console.log(err.message);
				}
			}
		},
		[fetchVideo]
	);

	const onPause = useCallback(() => {
		setPaused(true);
	}, []);

	const onResume = useCallback(() => {
		setPaused(false);
	}, []);

	useEffect(() => {
		if (playIdx !== null) {
			audio.current = tracks[playIdx] as Track;

			if (navigator.mediaSession) {
				const video = (tracks[playIdx] as Track).video;
				navigator.mediaSession.metadata = new MediaMetadata({
					artist: `Artist: ${video.author}\n${video.description}`,
					artwork: [{ src: video.thumb }],
					title: video.title
				});
			}
		} else {
			audio.current = null;
		}
	}, [tracks, playIdx]);

	useEffect(() => {
		if (navigator.mediaSession) {
			navigator.mediaSession.setActionHandler('nexttrack', () => {
				setProgressing(true);
			});
			navigator.mediaSession.setActionHandler('pause', () => {
				if (audio.current && audio.current.isPlaying()) {
					audio.current.pause();
				}
			});
			navigator.mediaSession.setActionHandler('play', () => {
				if (audio.current && audio.current.wasPlaying()) {
					audio.current.resume();
				}
			});
		}
	}, []);

	useEffect(() => {
		const rawTracks = JSON.parse(localStorage.getItem('music-player:tracks') || '[]') as (RawTrack | PlaceholderTrack)[];
		rawTracks.forEach((rawTrack) => {
			if ('placeholder' in rawTrack) {
				const cancel = fetchVideo(rawTrack.id!);
				rawTrack.cancel = cancel;
			}
		});
		setTracks(rawTracks.map((rawTrack) => ('placeholder' in rawTrack ? rawTrack : Track.fromRaw(rawTrack, audioLoader))));

		const hotkeyListener = (evt: KeyboardEvent) => {
			if (evt.key === 'n') {
				setProgressing(true);
			} else if (evt.key === 'p') {
				if (audio.current?.isPlaying()) {
					audio.current?.pause();
					setPaused(true);
				} else {
					if (audio.current?.wasPlaying()) {
						audio.current?.resume();
					} else {
						audio.current?.play();
					}
					setPaused(false);
				}
			}
		};

		window.addEventListener('keypress', hotkeyListener);

		return () => {
			window.removeEventListener('keypress', hotkeyListener);
		};
	}, [fetchVideo, audioLoader]);

	useEffect(() => {
		const closeListener = () => {
			placeholders.filter((placeholder) => placeholder.cancel !== null).forEach((placeholder) => placeholder.cancel!());
		};

		window.addEventListener('beforeunload', closeListener);

		return () => {
			window.removeEventListener('beforeunload', closeListener);
		};
	}, [placeholders]);

	useEffect(() => {
		updateLocalStorage(tracks);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [JSON.stringify(tracks)]);

	useEffect(() => {
		const unsubscribers = tracks.filter<Track>(isTrack).map((track, i) => {
			return track.onEnd(() => {
				console.log('ended');
				if (!progressing) {
					track.play();
					console.log(`Repeating ${i}`);
				} else {
					let idx = i === tracks.length - 1 ? 0 : i + 1,
						candidateTrack = tracks[idx];
					while (!isTrack(candidateTrack)) {
						idx = idx === tracks.length - 1 ? 0 : idx + 1;
						candidateTrack = tracks[idx];
					}
					candidateTrack.play();
					setPlayIdx(idx);
					setProgressing(false);
				}
			});
		});

		return () => {
			unsubscribers.forEach((unsubscribe) => unsubscribe());
		};
	}, [tracks, progressing]);

	useEffect(() => {
		axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL!}/wakeup`);
	}, []);

	return (
		<div
			className={styles.main}
			ref={(elem) => {
				mainRef.current = elem;
			}}>
			<Head>
				<title>Music Player</title>
				<style>{`html { overflow: hidden; }`}</style>
			</Head>
			<div
				className={styles.controls}
				ref={(elem) => {
					controlRef.current = elem;
				}}>
				<Input
					id="link-input"
					label="Video URL"
					value={newId}
					onChange={(evt) => setNewId(evt.target.value)}
					onEnter={() => {
						addLink(newId);
					}}
				/>
				<Button
					onClick={() => {
						addLink(newId);
					}}>
					Add Link
				</Button>
				<Button onClick={() => setProgressing(true)} disabled={progressing} hint="Progress to next song (hotkey: N)">
					Next!
				</Button>
			</div>
			<div
				className={styles.tracks + (tooLong ? ' ' + styles.long : '')}
				ref={(elem) => {
					listRef.current = elem;
				}}>
				{tracks.map((track, i) =>
					isTrack(track) ? (
						<VideoTile
							track={track}
							playing={i === playIdx && !paused}
							onPause={onPause}
							onPlay={() => {
								if (audio.current?.isPlaying()) {
									audio.current?.pause();
								}

								setPaused(false);
								setPlayIdx(i);
							}}
							onResume={onResume}
							updateLocalStorage={() => {
								updateLocalStorage(tracks);
							}}
							del={() => {
								setTracks([...tracks.slice(0, i), ...tracks.slice(i + 1)]);

								if (playIdx && i > playIdx) {
									setPlayIdx(playIdx - 1);
								}
							}}
							// startDrag={(evt, div) => {
							// 	startY.current = evt.pageY;
							// 	changeIdx.current = 0;
							// 	div.style.position = 'absolute';
							// 	div.style.width = '1174px';
							// 	div.style.zIndex = '2';
							// 	const listener = (evt: MouseEvent) => {
							// 		const deltaY = evt.y - startY.current!;
							// 		div.style.top = `${evt.y}px`;

							// 		if (
							// 			deltaY > 211.88 * (changeIdx.current! + 0.75) &&
							// 			deltaY < 211.88 * (changeIdx.current! + 1) &&
							// 			i + changeIdx.current! < tracks.length - 1
							// 		) {
							// 			changeIdx.current!++;
							// 			const idx = changeIdx.current!;
							// 			const tracks = tracksRef.current!;

							// 			const newTracks: (PlaceholderTrack | Track)[] = [];
							// 			for (let j = 0; j < tracks.length; j++) {
							// 				const track = tracks[j];
							// 				if (!('placeholder' in track && track.id === null)) {
							// 					if (j === i + idx) {
							// 						newTracks.push({ placeholder: true, id: null, cancel: null });
							// 					} else {
							// 						newTracks.push(tracks[j]);
							// 					}
							// 				} else {
							// 					newTracks.push(tracks[j + 1]);
							// 				}
							// 			}

							// 			setTracks(newTracks);
							// 			tracksRef.current = newTracks;
							// 		} else if (
							// 			deltaY < 211.88 * (changeIdx.current! + 0.25) &&
							// 			deltaY > 211.88 * changeIdx.current! &&
							// 			i + changeIdx.current! > 0
							// 		) {
							// 			changeIdx.current!--;
							// 			const idx = changeIdx.current!;
							// 			const tracks = tracksRef.current!;

							// 			const newTracks: (PlaceholderTrack | Track)[] = [];
							// 			for (let j = 0; j < tracks.length; j++) {
							// 				const track = tracks[j];
							// 				if (!('placeholder' in track && track.id === null)) {
							// 					if (j === i + idx) {
							// 						newTracks.push({ placeholder: true, id: null, cancel: null });
							// 					} else {
							// 						newTracks.push(tracks[j]);
							// 					}
							// 				} else {
							// 					newTracks.push(tracks[j - 1]);
							// 				}
							// 			}

							// 			setTracks(newTracks);
							// 			tracksRef.current = newTracks;
							// 		}
							// 	};

							// 	const nt: (PlaceholderTrack | Track)[] = [
							// 		...tracks.slice(0, i + 1),
							// 		{ placeholder: true, id: null, cancel: null },
							// 		...tracks.slice(i + 1)
							// 	];
							// 	setTracks(nt);
							// 	tracksRef.current = nt;

							// 	window.addEventListener('mousemove', listener);
							// 	window.addEventListener(
							// 		'mouseup',
							// 		() => {
							// 			const newTracks: (PlaceholderTrack | Track)[] = [];
							// 			console.log('Tracks', tracksRef.current);
							// 			for (let j = 0; j < tracksRef.current!.length; j++) {
							// 				const itTrack = tracksRef.current![j];
							// 				console.log(track, itTrack, track === itTrack);
							// 				if (track !== itTrack) {
							// 					if ('placeholder' in itTrack && itTrack.id === null) {
							// 						newTracks.push(track);
							// 					} else {
							// 						newTracks.push(itTrack);
							// 					}
							// 				}
							// 			}

							// 			div.style.removeProperty('width');
							// 			div.style.removeProperty('top');
							// 			div.style.removeProperty('position');
							// 			div.style.removeProperty('z-index');
							// 			changeIdx.current = null;
							// 			startY.current = null;
							// 			tracksRef.current = null;
							// 			setTracks(newTracks);

							// 			window.removeEventListener('mousemove', listener);
							// 		},
							// 		{ once: true }
							// 	);
							// }}
							key={track.video._id}
						/>
					) : (
						<PlaceholderTile id={track.id} key={track.id} />
					)
				)}
			</div>
		</div>
	);
};

export default Index;
