import axios from 'axios';
import Head from 'next/head';
import { GetServerSideProps, NextPage } from 'next/types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PlaceholderTile from '../components/PlaceholderTile/PlaceholderTile';
import VideoTile from '../components/VideoTile/VideoTile';
import styles from '../sass/Index.module.scss';
import { getId, isPlaceholder, isTrack, Track, updateLocalStorage } from '../util/utils';

const Index: NextPage = () => {
	const [newId, setNewId] = useState<string>('');
	const [tracks, setTracks] = useState<(Track | PlaceholderTrack)[]>([]);
	const [playIdx, setPlayIdx] = useState<number>(0);
	const [progressing, setProgressing] = useState<boolean>(false);
	const [paused, setPaused] = useState<boolean>(true);
	const placeholders = useMemo(() => tracks.filter<PlaceholderTrack>(isPlaceholder), [tracks]);
	const audio = useRef<Track>(tracks[playIdx] as Track);

	const fetchVideo = useCallback((id: string) => {
		const { token, cancel } = axios.CancelToken.source();
		axios.post<Video>(`${process.env.NEXT_PUBLIC_BACKEND_URL!}/load`, { id }, { cancelToken: token }).then((res) => {
			const video = res.data;
			const track = new Track(video);
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
	}, []);

	const addLink = useCallback(
		(newLink) => {
			if (newLink !== '') {
				const id = getId(newLink);

				const cancel = fetchVideo(id);

				setTracks((tracks) => [...tracks, { placeholder: true, id, cancel }]);
				setNewId('');
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
		audio.current = tracks[playIdx] as Track;
	}, [tracks, playIdx]);

	useEffect(() => {
		const rawTracks = JSON.parse(localStorage.getItem('music-player:tracks') || '[]') as (RawTrack | PlaceholderTrack)[];
		rawTracks.forEach((rawTrack) => {
			if ('placeholder' in rawTrack) {
				fetchVideo(rawTrack.id);
			}
		});
		setTracks(rawTracks.map((rawTrack) => ('placeholder' in rawTrack ? rawTrack : Track.fromRaw(rawTrack))));

		const hotkeyListener = (evt: KeyboardEvent) => {
			if (evt.key === 'n') {
				setProgressing(true);
			} else if (evt.key === 'p') {
				if (audio.current.isPlaying()) {
					audio.current.pause();
					setPaused(true);
				} else {
					if (audio.current.wasPlaying()) {
						audio.current.resume();
					} else {
						audio.current.play();
					}
					setPaused(false);
				}
			}
		};

		window.addEventListener('keypress', hotkeyListener);

		return () => {
			window.removeEventListener('keypress', hotkeyListener);
		};
	}, [fetchVideo]);

	useEffect(() => {
		const closeListener = () => {
			placeholders.forEach((placeholder) => placeholder.cancel());
		};

		window.addEventListener('beforeunload', closeListener);

		return () => {
			window.removeEventListener('beforeunload', closeListener);
		};
	}, [placeholders]);

	useEffect(() => {
		updateLocalStorage(tracks);
	}, [tracks]);

	useEffect(() => {
		const unsubscribers = tracks.filter<Track>(isTrack).map((track, i) => {
			return track.onEnd(() => {
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

	return (
		<div className={styles.main}>
			<Head>
				<title>Music Player</title>
			</Head>
			<div>
				<div>
					<input
						value={newId}
						onChange={(evt) => setNewId(evt.target.value)}
						onKeyPress={(evt) => {
							if (evt.key === 'Enter') {
								addLink(newId);
							}
						}}></input>
					<button
						onClick={() => {
							addLink(newId);
						}}>
						Add Link
					</button>
					<button onClick={() => setProgressing(true)} disabled={progressing}>
						Next!
					</button>
				</div>
				<div>
					{tracks.map((track, i) =>
						isTrack(track) ? (
							<VideoTile
								track={track}
								playing={i === playIdx && !paused}
								onPause={onPause}
								onPlay={() => {
									setPaused(false);
									setPlayIdx(i);
								}}
								onResume={onResume}
								updateLocalStorage={() => {
									updateLocalStorage(tracks);
								}}
								key={track.video._id}
							/>
						) : (
							<PlaceholderTile id={track.id} key={track.id} />
						)
					)}
				</div>
				<div className={styles.footer}>
					Huge thanks to{' '}
					<a href="https://y2mate.com" target="_blank" rel="noopener noreferrer">
						y2mate.com
					</a>{' '}
					for performing the video to mp3 conversion that allows this app to run :&#41;
				</div>
			</div>
		</div>
	);
};

export const getServerSideProps: GetServerSideProps = async () => {
	axios.post(`${process.env.NEXT_PUBLIC_BACKEND_API!}/wakeup`);

	return { props: {} };
};

export default Index;
