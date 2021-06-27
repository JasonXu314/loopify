import { GridFSBucket, MongoClient } from 'mongodb';
import { NextApiRequest, NextApiResponse } from 'next';
import ytdl from 'ytdl-core';
import { rawNumberToTime } from '../../util/utils';

export default async (req: NextApiRequest, res: NextApiResponse<Video | string>): Promise<void> => {
	const client = await MongoClient.connect(process.env.MONGODB_URL!, { useNewUrlParser: true, useUnifiedTopology: true });
	try {
		const db = client.db('audio');
		const gridFS = new GridFSBucket(db);
		const id = req.body.id as string | undefined;

		if (!id) {
			res.status(400).send('Id is required');
			await client.close();
			return;
		}

		const video = await db.collection<Video>('metadata').findOne({ _id: id });

		if (video) {
			res.status(200).json(video);
		} else {
			console.log(`Saving video with id ${id}`);

			const url = `https://www.youtube.com/watch?v=${id}`;

			const dlStream = ytdl(url);
			const {
				player_response: {
					videoDetails: { title, lengthSeconds, shortDescription, author }
				}
			} = await ytdl.getBasicInfo(url);
			const duration = rawNumberToTime(parseInt(lengthSeconds));

			const writeStream = gridFS.openUploadStreamWithId(id, title);
			dlStream.pipe(writeStream);
			await new Promise((resolve) => {
				dlStream.on('finish', resolve);
				dlStream.on('close', resolve);
			});

			console.log(`Video id ${id} written to db`);

			const video = {
				_id: id,
				url,
				title,
				duration,
				description: shortDescription,
				author,
				thumb: `https://i.ytimg.com/vi/${id}/1.jpg`,
				audio: `${process.env.LOCATION!}/audio/${id}`
			};

			await db.collection('metadata').insertOne(video);

			res.status(201).json(video);
		}
	} catch (err) {
		console.error(err);
	} finally {
		await client.close();
	}
};
