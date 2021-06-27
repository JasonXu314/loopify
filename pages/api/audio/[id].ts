import contentDisposition from 'content-disposition';
import { GridFSBucket, MongoClient, ObjectId } from 'mongodb';
import { NextApiRequest, NextApiResponse } from 'next';

export default async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
	const client = await MongoClient.connect(process.env.MONGODB_URL!, { useNewUrlParser: true, useUnifiedTopology: true });
	try {
		const db = client.db('audio');
		const gridFS = new GridFSBucket(db);
		const id = req.query.id as string | undefined;

		const video = await db.collection<Video>('metadata').findOne({ _id: id });

		if (video) {
			res.status(200).setHeader('Content-Disposition', contentDisposition(`${video.title}.mp3`));
			const dlStream = gridFS.openDownloadStream(id as unknown as ObjectId);

			dlStream.pipe(res);

			await new Promise((resolve) => {
				dlStream.on('close', resolve);
				dlStream.on('end', resolve);
			});
		} else {
			res.status(404).send('No video with that id found');
		}
	} catch (err) {
		console.log(err);
	} finally {
		await client.close();
	}
};
