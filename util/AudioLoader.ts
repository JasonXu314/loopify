import axios from 'axios';

export default class AudioLoader {
	private queue: string[];
	private resolvers: ((value: Blob | PromiseLike<Blob>) => void)[];
	private current: Promise<Blob> | null;

	constructor() {
		this.queue = [];
		this.resolvers = [];
		this.current = null;
	}

	public async load(url: string): Promise<Blob> {
		return new Promise((resolve) => {
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
		this.queue.shift();
		const resolve = this.resolvers.shift()!;
		this.current = null;

		if (this.queue.length !== 0) {
			const nextId = this.queue[0];

			const promise = this.fetch(nextId);

			this.current = promise;
			promise.then(this.handleLoaded.bind(this));
		}

		resolve(blob);
	}

	private async fetch(url: string): Promise<Blob> {
		return axios.get<Blob>(url, { responseType: 'blob' }).then((res) => res.data);
	}
}
