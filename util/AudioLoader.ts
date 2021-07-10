import axios from 'axios';

export default class AudioLoader {
	private queue: string[];
	private resolvers: ((value: Blob | PromiseLike<Blob>) => void)[];
	private current: Promise<Blob> | null;
	private db: IDBDatabase | null;
	private loadDb: Promise<void> | null;

	constructor() {
		this.queue = [];
		this.resolvers = [];
		this.current = null;
		if (typeof window !== 'undefined') {
			const req = indexedDB.open('loopify:audio');
			this.loadDb = new Promise((resolve, reject) => {
				req.onupgradeneeded = () => {
					if (!req.transaction!.db.objectStoreNames.contains('files')) {
						req.transaction!.db.createObjectStore('files');
					}
				};
				req.onsuccess = () => {
					this.db = req.result;
					this.loadDb = null;
					resolve();
				};
				req.onerror = () => {
					reject();
				};
			});
			this.db = null;
		} else {
			this.db = null;
			this.loadDb = null;
		}
	}

	public async load(url: string): Promise<Blob> {
		return new Promise((resolve) => {
			if (!this.db) {
				this.loadDb!.then(() => {
					const req = this.db!.transaction('files')
						.objectStore('files')
						.get(url.slice(url.length - 11));

					req.onsuccess = () => {
						if (!req.result) {
							if (!this.current) {
								const promise = this.fetch(url);

								this.current = promise;
								this.queue.push(url);
								this.resolvers.push(resolve);
								promise.then(this.handleLoaded.bind(this));
							} else {
								this.queue.push(url);
								this.resolvers.push(resolve);
							}
						} else {
							resolve(req.result);
						}
					};
				});
			}
		});
	}

	public prioritize(url: string): void {
		if (this.queue[0] !== url) {
			const idx = this.queue.findIndex((thisId) => thisId === url);
			this.queue = [this.queue[0], url, ...this.queue.slice(1, idx), ...this.queue.slice(idx + 1)];
			this.resolvers = [this.resolvers[0], this.resolvers[idx], ...this.resolvers.slice(1, idx), ...this.resolvers.slice(idx + 1)];
		}
	}

	private handleLoaded(blob: Blob): void {
		const url = this.queue.shift()!;
		const resolve = this.resolvers.shift()!;
		this.current = null;

		if (this.queue.length !== 0) {
			const nextId = this.queue[0];

			const promise = this.fetch(nextId);

			this.current = promise;
			promise.then(this.handleLoaded.bind(this));
		}

		this.db!.transaction('files', 'readwrite')
			.objectStore('files')
			.put(blob, url.slice(url.length - 11));
		resolve(blob);
	}

	private async fetch(url: string): Promise<Blob> {
		return axios.get<Blob>(url, { responseType: 'blob' }).then((res) => res.data);
	}
}
