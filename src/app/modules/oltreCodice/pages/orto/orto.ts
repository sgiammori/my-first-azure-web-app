import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { environment } from '../../../../shared/environments';

type MediaType = 'image' | 'video';

interface OrtoMediaItem {
  src: string;
  filename: string;
  year: number;
  type: MediaType;
}

interface YearGallery {
  year: number;
  items: OrtoMediaItem[];
}

interface LightboxImage {
  src: string;
  alt: string;
}

const GREEN_MEDIA_FILENAMES: string[] = [
  '2020-0.jpg',
  '2020-1.jpg',
  '2021-0.jpg',
  '2021-1.jpg',
  '2026-0.jpg',
  '2026-1.jpg',
  '2026-2.jpg',
  '2026-3.jpg',
  '2026-4.jpg',
  '2026-5.mp4',
  '2026-6.jpg',
  '2026-7.jpg',
  '2026-8.jpg',
  '2026-9.jpg',
  '2026-10.jpg'
];

@Component({
  selector: 'app-orto',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './orto.html',
  styleUrl: './orto.css',
  providers: [Title, Meta]
})
export class Orto {
  readonly galleryByYear: YearGallery[];
  activeImage: LightboxImage | null = null;

  constructor(
    private titleService: Title,
    private metaService: Meta,
    @Inject(PLATFORM_ID) private platformId: Object,
    @Inject(DOCUMENT) private doc: Document
  ) {
    this.galleryByYear = this.buildGalleryByYear();

    this.titleService.setTitle("L'orto di casa - Stefano Giammori");
    this.metaService.updateTag({ name: 'description', content: "Stagioni, sementi ed esperimenti dall'orto di casa di Stefano Giammori. Dalla terra al tavolo, passando per la pazienza." });
    this.metaService.updateTag({ property: 'og:title', content: "L'orto di casa - Stefano Giammori" });
    this.metaService.updateTag({ property: 'og:description', content: "Stagioni, sementi ed esperimenti dall'orto di casa." });
    this.metaService.updateTag({ property: 'og:type', content: 'website' });
    this.metaService.updateTag({ property: 'og:image', content: 'https://raw.githubusercontent.com/sgiammori/photoShoots/refs/heads/main/android_logo_storicoapp_fb.png' });
    this.metaService.updateTag({ property: 'og:url', content: environment.baseUrl + '/oltreCodice/orto' });

    if (isPlatformBrowser(this.platformId)) {
      const existing = this.doc.querySelector('link[rel="canonical"]');
      if (existing) existing.remove();
      const canonical: HTMLLinkElement = this.doc.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      canonical.setAttribute('href', environment.baseUrl + '/oltreCodice/orto');
      this.doc.head.appendChild(canonical);
    }
  }

  private buildGalleryByYear(): YearGallery[] {
    const mediaItems = GREEN_MEDIA_FILENAMES
      .map((filename) => this.parseMediaItem(filename))
      .filter((item): item is OrtoMediaItem => item !== null)
      .sort((a, b) => {
        if (a.year !== b.year) {
          return a.year - b.year;
        }

        return a.filename.localeCompare(b.filename, undefined, { numeric: true, sensitivity: 'base' });
      });

    const grouped = new Map<number, OrtoMediaItem[]>();

    for (const item of mediaItems) {
      const currentYearItems = grouped.get(item.year) ?? [];
      currentYearItems.push(item);
      grouped.set(item.year, currentYearItems);
    }

    return Array.from(grouped.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([year, items]) => ({ year, items }));
  }

  private parseMediaItem(filename: string): OrtoMediaItem | null {
    const yearMatch = filename.match(/^(\d{4})-/);

    if (!yearMatch) {
      return null;
    }

    const year = Number(yearMatch[1]);

    if (!Number.isInteger(year)) {
      return null;
    }

    const extension = filename.split('.').pop()?.toLowerCase() ?? '';
    const type: MediaType = extension === 'mp4' || extension === 'webm' || extension === 'mov' ? 'video' : 'image';

    return {
      src: `/images/green/${filename}`,
      filename,
      year,
      type
    };
  }

  openImage(media: OrtoMediaItem): void {
    if (media.type !== 'image') {
      return;
    }

    this.activeImage = {
      src: media.src,
      alt: `Orto ${media.year}`
    };
  }

  closeImage(): void {
    this.activeImage = null;
  }
}
