import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { INews } from '../../shared/models/INews';
import { environment } from '../../shared/environments';

@Injectable({ providedIn: 'root' })
export class PersistanceService {
	private readonly FILE_NAME = 'data.txt';
	constructor(@Inject(PLATFORM_ID) private platformId: Object) {}


	async saveNewsList(newsList: INews[]): Promise<void> {
		try {
			// /api/news is served by the Firestore-backed Azure Function (api/news.js),
			// reachable at funcUrl from both server and browser.
			const url = environment.funcUrl + '/api/news';
			const response = await fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(newsList, null, 2),
			});
			if (!response.ok) {
				throw new Error('Failed to save news: ' + (await response.text()));
			}
		} catch (e) {
			console.error('Failed to save news via API', e);
		}
	}


	async loadNewsListFromFile(): Promise<INews[]> {
		try {
			const url = environment.funcUrl + '/api/news';
			const response = await fetch(url, { cache: 'no-store' });
			if (response.ok) {
				const news = await response.json();
				if (Array.isArray(news)) return news;
			}

		} catch (e) {
			console.error('Failed to load news via API', e);
		}
		return [];
	}
}
