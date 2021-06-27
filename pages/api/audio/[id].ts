import contentDisposition from 'content-disposition';
import { GridFSBucket, MongoClient, ObjectId } from 'mongodb';
import { NextApiRequest, NextApiResponse } from 'next';

export default async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
	const client = await MongoClient.connect(process.env.MONGODB_URL!, { useNewUrlParser: true, useUnifiedTopology: true });
	try {
		const db = client.db('audio');
		const gridFS = new GridFSBucket(db);
		const id = req.query.id as string | undefined;

		console.log('hi');
		const video = await db.collection<Video>('metadata').findOne({ _id: id });

		console.log('hi2');
		if (video) {
			console.log('hi3');
			res.status(200).setHeader('Content-Disposition', contentDisposition(`${video.title}.mp3`));
			console.log('hi4');
			const dlStream = gridFS.openDownloadStream(id as unknown as ObjectId);

			console.log('hi5');
			dlStream.pipe(res);

			console.log('hi6');
			await new Promise((resolve) => {
				dlStream.on('close', resolve);
				dlStream.on('end', resolve);
			});
			console.log('hi7');
		} else {
			res.status(404).send('No video with that id found');
		}
	} catch (err) {
		console.log(err);
		res.status(500).send(err);
	} finally {
		await client.close();
	}
};
