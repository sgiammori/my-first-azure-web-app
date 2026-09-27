import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, DOCUMENT, Inject, inject, OnInit, PendingTasks, PLATFORM_ID, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { WINDOW } from '../../shared/window';
import { Homeblogtunnel } from '../../core/services/data/homeblogtunnel';
import { Meta, Title } from '@angular/platform-browser';
import { environment } from '../../shared/environments';

// How often the ANSA news list is refreshed while the Home page is open (5 minutes).
const NEWS_REFRESH_MS = 5 * 60 * 1000;
// Max time SSR is allowed to wait for ANSA news before rendering anyway.
const SSR_NEWS_MAX_WAIT_MS = 1200;

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
  providers: [Title, Meta]
})

export class Home implements OnInit {

  ansaNews = signal<any[]>([]);
  private destroyRef = inject(DestroyRef);
  private pendingTasks = inject(PendingTasks);

  constructor(
    @Inject(WINDOW) public window: Window,
    public homeblogtunnelservice: Homeblogtunnel,
    private titleService: Title,
    private metaService: Meta,
    @Inject(PLATFORM_ID) private platformId: Object,
    @Inject(DOCUMENT) private doc: Document
  ) {
    // --- SEO setup for the Home page ---
    // Runs on both server (SSR) and browser, so crawlers receive these tags in the rendered HTML.

    // <title>: shown in the browser tab and as the headline in search results.
    this.titleService.setTitle('Stefano Giammori | Web Developer & Innovator');
    // <meta name="description">: the snippet search engines show under the title.
    this.metaService.updateTag({ name: 'description', content: 'Benvenuto nel sito di Stefano Giammori: sviluppo web, cloud, automazione e soluzioni digitali. Scopri progetti, servizi e il mio percorso professionale.' });

    // Open Graph tags: control the preview card (title, text, image, link)
    // when the page is shared on Facebook, LinkedIn, WhatsApp, etc.
    this.metaService.updateTag({ property: 'og:title', content: 'Home - Stefano Giammori' });
    this.metaService.updateTag({ property: 'og:description', content: 'Benvenuto nel sito di Stefano Giammori: sviluppo web, cloud, automazione e soluzioni digitali.' });
    this.metaService.updateTag({ property: 'og:type', content: 'profile' });
    this.metaService.updateTag({ property: 'og:image', content: 'https://raw.githubusercontent.com/sgiammori/photoShoots/refs/heads/main/android_logo_storicoapp_fb.png' });
    this.metaService.updateTag({ property: 'og:url', content: environment.baseUrl + '/home' });

    // Canonical link: tells search engines the "official" URL of this page, avoiding
    // duplicate-content penalties. Any previous canonical (from another route) is removed first.
    // Only runs in the browser, so it is NOT present in the server-rendered HTML.
    if (isPlatformBrowser(this.platformId)) {
      const existing = this.doc.querySelector('link[rel="canonical"]');
      if (existing) existing.remove();
      const canonical: HTMLLinkElement = this.doc.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      canonical.setAttribute('href', environment.baseUrl + '/oltreCodice');
      this.doc.head.appendChild(canonical);
    }
  }

  ngOnInit() {
    // First load in the browser should not block page startup.
    if (isPlatformBrowser(this.platformId)) {
      void this.loadNews();
    } else {
      // On SSR we still try to include news in HTML, but cap waiting time to avoid
      // slow server responses when the upstream feed is delayed.
      this.pendingTasks.run(() => this.loadNewsWithTimeout(SSR_NEWS_MAX_WAIT_MS));
    }

    // Periodic refresh (browser only). An effect() is not the right tool here:
    // effects re-run when a signal they read changes, not after time passes, and
    // nothing in this component changes on its own when new news is published.
    // A timer is what keeps the list current. It is not started on the server,
    // where an open-ended timer would never let the render finish.
    if (isPlatformBrowser(this.platformId)) {
      const intervalId = setInterval(() => this.loadNews(), NEWS_REFRESH_MS);
      // Stop the timer when the user leaves the Home page, so it doesn't keep fetching.
      this.destroyRef.onDestroy(() => clearInterval(intervalId));
    }
  }

  /**
   * Fetches ANSA news from the Azure Function and stores it in the ansaNews signal.
   * Setting the signal is enough to refresh the template (the app is zoneless).
   */
  private async loadNews(abortSignal?: AbortSignal) {
    try {
      let newsRes;
      // On localhost the dev proxy (proxy.conf.js) forwards /api to the local Function;
      // everywhere else (production and the SSR server) the Function is called directly.
      if (isPlatformBrowser(this.platformId) && this.window.location.href.includes('localhost'))
        newsRes = await fetch('/api/ansanews', { signal: abortSignal });
      else
        newsRes = await fetch(environment.funcUrl + '/api/ansanews', { signal: abortSignal });
      if (!newsRes.ok) throw new Error(`HTTP ${newsRes.status}`);
      const newsRaw = await newsRes.json();
      this.ansaNews.set(this.formatAndSortAnsaNews(newsRaw));
    } catch (e) {
      // If a refresh fails, keep the news already on screen instead of clearing it
      // (on the very first load the signal simply stays at its initial empty array).
    }
  }

  /**
   * SSR helper: wait for news only for a bounded amount of time.
   */
  private async loadNewsWithTimeout(maxWaitMs: number): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), maxWaitMs);
    try {
      await this.loadNews(controller.signal);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Sorts ANSA news by pubDate descending (most recent first) and formats pubDate as dd-mm-yy.
   * Returns a new array with formatted dates.
   */
  formatAndSortAnsaNews(news: any[]): any[] {
    // Helper to parse pubDate string like "Wed, 25 Mar 2026 19:13:43 +0100"
    function parsePubDate(pubDate: string): Date | null {
      const parsed = Date.parse(pubDate);
      if (!isNaN(parsed)) return new Date(parsed);
      return null;
    }
    // Helper to format date as dd-mm-yy
    function formatDateDDMMYY(date: Date): string {
      const dd = String(date.getDate()).padStart(2, '0');
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const yy = String(date.getFullYear()).slice(-2);
      return `${dd}/${mm}/${yy}`;
    }
    // Helper to format date as dd-mm-yy, h:mm A (12h, locale, with comma)
    function formatDateDDMMYYTime(date: Date): string {
      const datePart = formatDateDDMMYY(date);
      // Use toLocaleTimeString for 12h format with AM/PM, remove seconds
      let time = date.toLocaleTimeString('it-IT', { hour: 'numeric', minute: '2-digit', hour12: true });
      // Remove any seconds and normalize spacing (e.g., "9:19 PM")
      time = time.replace(/\.\d\d?\s*/, ' ').replace(/\s+/, ' ');
      return `${datePart}, ${time}`;
    }
    // Map, sort, and format
    return news
      .map(item => {
        const dateObj = parsePubDate(item.pubDate);
        return {
          ...item,
          pubDateFormatted: dateObj ? formatDateDDMMYY(dateObj) : '',
          pubDateFormattedTime: dateObj ? formatDateDDMMYYTime(dateObj) : '',
          _sortDate: dateObj ? dateObj.getTime() : 0
        };
      })
      .sort((a, b) => b._sortDate - a._sortDate)
      .map(({ _sortDate, ...rest }) => rest); // Remove _sortDate helper
  }

  /**
   * Formats a blog post date for display in Italian format (e.g. "25/3/2026").
   *
   * Used in home.html by the "Blog Posts" lists (desktop and mobile layouts):
   * `{{ convertDate(post.date) }}`, where posts come from Homeblogtunnel.getNewsList().
   *
   * post.date can have different shapes depending on where the post came from:
   * - a Date object (normal case: Homeblogtunnel converts string dates when loading,
   *   and the Blog page creates new posts with `new Date()`);
   * - a string (ISO or DD/MM/YYYY) if a raw value slipped through;
   * - empty/undefined for posts without a date.
   * Anything it cannot parse is shown as-is rather than hidden.
   */
  convertDate(dateInput: any): string {
    if (!dateInput) return '';
    // If already a Date object
    if (dateInput instanceof Date) {
      return dateInput.toLocaleDateString('it-IT');
    }
    // If string, try DD/MM/YYYY first, then ISO
    if (typeof dateInput === 'string') {
      // DD/MM/YYYY must be checked before Date.parse: Date.parse reads "03/04/2026"
      // as US-style MM/DD (4 March instead of 3 April).
      const match = dateInput.match(/^\d{2}\/\d{2}\/\d{4}$/);
      if (match) {
        const [day, month, year] = dateInput.split('/');
        return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString('it-IT');
      }
      // Try ISO
      const iso = Date.parse(dateInput);
      if (!isNaN(iso)) {
        return new Date(iso).toLocaleDateString('it-IT');
      }
      // Fallback: return as is
      return dateInput;
    }
    // Fallback: return as string
    return String(dateInput);
  }
}
