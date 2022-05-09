import { Button, Group, Space, Stack, TextInput, Tooltip } from '@mantine/core';
import { getHotkeyHandler, useHotkeys } from '@mantine/hooks';
import axios from 'axios';
import Head from 'next/head';
import { NextPage } from 'next/types';
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd';
import PlaceholderTile from '../components/PlaceholderTile/PlaceholderTile';
import VideoTile from '../components/VideoTile/VideoTile';
import styles from '../sass/Index.module.scss';
import AudioLoader from '../util/AudioLoader';
import Track from '../util/Track';
import { getId, handleSpecial, isPlaceholder, isTrack, rawNumberToTime, updateLocalStorage } from '../util/utils';

const Index: NextPage = () => {
	const [newId, setNewId] = useState<string>('');
	const [tracks, setTracks] = useState<(Track | PlaceholderTrack)[]>([]);
	const [playIdx, setPlayIdx] = useState<number | null>(null);
	const [progressing, setProgressing] = useState<boolean>(false);
	const [paused, setPaused] = useState<boolean>(true);
	const placeholders = useMemo(() => tracks.filter<PlaceholderTrack>(isPlaceholder), [tracks]);
	const audioLoader = useMemo(() => new AudioLoader(), []);
	const audio = useRef<Track | null>(playIdx !== null ? (tracks[playIdx] as Track) : null);
	const changeIdx = useRef<number | null>(null);

	const fetchVideo = useCallback(
		(id: string) => {
			const { token, cancel } = axios.CancelToken.source();
			axios.get<VideoInfo>(`${process.env.NEXT_PUBLIC_BACKEND_URL!}/info?id=${id}`, { cancelToken: token }).then((res) => {
				const videoInfo = res.data.player_response.videoDetails;
				const video: Video = {
					_id: id,
					audio: `${process.env.NEXT_PUBLIC_BACKEND_URL!}/audio?id=${id}`,
					author: videoInfo.author,
					description: videoInfo.shortDescription,
					duration: rawNumberToTime(parseInt(videoInfo.lengthSeconds)),
					thumb: `https://i.ytimg.com/vi/${id}/1.jpg`,
					title: videoInfo.title,
					url: `https://www.youtube.com/watch?v=${id}`
				};
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

	const addLink = useCallback(
		(newLink) => {
			if (newLink !== '') {
				try {
					const id = getId(newLink);

					const cancel = fetchVideo(id);

					setTracks((tracks) => [...tracks, { placeholder: true, id, cancel }]);
					setNewId('');
				} catch (err: any) {
					console.log(err.message);
				}
			}
		},
		[fetchVideo]
	);

	const onPause = useCallback(() => {
		setPaused(true);
	}, []);

	useEffect(() => {
		if (playIdx !== null) {
			audio.current = (changeIdx.current !== null ? tracks.filter((track) => !isPlaceholder(track) || track.id !== null) : tracks)[playIdx] as Track;

			if (navigator.mediaSession) {
				if (changeIdx.current !== null) {
					const video = audio.current.video;
					navigator.mediaSession.metadata = new MediaMetadata({
						artist: `Artist: ${handleSpecial(video.author)}\n${handleSpecial(video.description)}`,
						artwork: [{ src: video.thumb }],
						title: handleSpecial(video.title)
					});
				} else {
					const video = (tracks[playIdx] as Track).video;
					navigator.mediaSession.metadata = new MediaMetadata({
						artist: `Artist: ${handleSpecial(video.author)}\n${handleSpecial(video.description)}`,
						artwork: [{ src: video.thumb }],
						title: handleSpecial(video.title)
					});
				}
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
					setPaused(true);
				}
			});
			navigator.mediaSession.setActionHandler('play', () => {
				if (audio.current && audio.current.wasPlaying()) {
					audio.current.resume();
					setPaused(false);
				}
			});
		}
	}, []);

	useHotkeys([
		[
			'n',
			() => {
				setProgressing(true);
			}
		],
		[
			'p',
			() => {
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
		]
	]);

	useEffect(() => {
		const rawTracks = JSON.parse(localStorage.getItem('music-player:tracks') || '[]') as (RawTrack | PlaceholderTrack)[];
		rawTracks.forEach((rawTrack) => {
			if ('placeholder' in rawTrack) {
				const cancel = fetchVideo(rawTrack.id!);
				rawTrack.cancel = cancel;
			}
		});
		setTracks(rawTracks.map((rawTrack) => ('placeholder' in rawTrack ? rawTrack : Track.fromRaw(rawTrack, audioLoader))));
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
		axios
			.post(`${process.env.NEXT_PUBLIC_BACKEND_URL!}/wakeup`)
			.then(() => {})
			.catch(() => {});
	}, []);

	return (
		<div className={styles.main}>
			<Head>
				<title>Music Player</title>
			</Head>
			<Group>
				<Stack>
					<TextInput
						id="link-input"
						placeholder="Video URL"
						label="Video URL"
						autoComplete="off"
						value={newId}
						onKeyUp={getHotkeyHandler([
							[
								'Enter',
								() => {
									addLink(newId);
								}
							]
						])}
						onChange={(evt: ChangeEvent<HTMLInputElement>) => setNewId(evt.target.value)}
					/>
					<Group>
						<Button
							onClick={() => {
								addLink(newId);
							}}>
							Add Link
						</Button>
						<Tooltip label="Progress to next song (hotkey: N)">
							<Button onClick={() => setProgressing(true)} disabled={progressing}>
								Next!
							</Button>
						</Tooltip>
					</Group>
				</Stack>
			</Group>
			<Space h="md" />
			<DragDropContext
				onDragEnd={(result) => {
					const newIdx = result.destination!.index;
					const sourceIdx = result.source.index;
					const newTracks = [...tracks];

					if (newIdx !== sourceIdx) {
						newTracks.splice(newIdx, 0, newTracks.splice(sourceIdx, 1)[0]);
						setTracks(newTracks);
					}
				}}>
				<Droppable droppableId="main">
					{(provided) => (
						<div ref={provided.innerRef} {...provided.droppableProps}>
							{tracks.map((track, i) => (
								<Draggable draggableId={isTrack(track) ? track.video._id : track.id!} index={i} key={isTrack(track) ? track.video._id : track.id!}>
									{(provided) => (
										<div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
											{isTrack(track) ? (
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
													updateLocalStorage={() => {
														updateLocalStorage(tracks);
													}}
													del={() => {
														setTracks([...tracks.slice(0, i), ...tracks.slice(i + 1)]);

														if (playIdx && i >= playIdx) {
															setPlayIdx(playIdx === 0 ? 0 : playIdx - 1);
														}
													}}
													key={track.serialize() + track.isPlaying()}
												/>
											) : (
												<PlaceholderTile id={track.id} />
											)}
										</div>
									)}
								</Draggable>
							))}
							{provided.placeholder}
						</div>
					)}
				</Droppable>
			</DragDropContext>
		</div>
	);
};

export default Index;
