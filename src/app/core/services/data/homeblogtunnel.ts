import { Injectable, signal } from '@angular/core';
import { PersistanceService } from '../persistance';

@Injectable({
  providedIn: 'root',
})
export class Homeblogtunnel {
  private newsList = signal<any[]>([]);

  constructor(private persistance: PersistanceService) {
    // Async initialization must not use await in constructor
    this.init();
  }

  private async init() {
    // Attempt to load newsList from data/news.txt
    try {
      const loaded = await this.persistance.loadNewsListFromFile();
      if (loaded && Array.isArray(loaded) && loaded.length > 0) {
        // Convert string dates to Date objects for Angular DatePipe compatibility
        const normalized = loaded.map(news => ({
          ...news,
          date: news.date && typeof news.date === 'string' ? parseDate(news.date) : news.date
        }));
        this.newsList.set(normalized);
        // If news loaded, do not overwrite editor content
        return;
      } else {
        this.newsList.set([]);
      }
    } catch (e) {
      // Ignore errors, fallback to default
      this.newsList.set([{ content: 'errore di caricamento news' }]);
    }
    // Helper to parse DD/MM/YYYY or ISO date strings
    function parseDate(dateStr: string): Date | string {
      // DD/MM/YYYY must be checked before Date.parse: Date.parse reads "03/04/2026"
      // as US-style MM/DD (4 March instead of 3 April).
      const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (match) {
        const [_, d, m, y] = match;
        return new Date(Number(y), Number(m) - 1, Number(d));
      }
      // Try ISO
      const iso = Date.parse(dateStr);
      if (!isNaN(iso)) return new Date(iso);
      return dateStr;
    }
  }

  setNewsList(newsList: any[]) {
    this.newsList.set(newsList);
  }

  getNewsList(): any[] {
    return [...this.newsList()].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

}
