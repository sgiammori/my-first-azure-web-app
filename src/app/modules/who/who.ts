import { isPlatformBrowser } from '@angular/common';
import { Component, DOCUMENT, Inject, PLATFORM_ID } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { environment } from '../../shared/environments';

@Component({
  selector: 'app-who',
  standalone: true,
  imports: [],
  templateUrl: './who.html',
  styleUrl: './who.css',
  providers: [Title, Meta]
})
export class Who {
  constructor(private titleService: Title, private metaService: Meta, @Inject(PLATFORM_ID) private platformId: Object, @Inject(DOCUMENT) private doc: Document) {
    this.titleService.setTitle('Chi sono - Stefano Giammori | Sviluppatore Web & Mobile');
    this.metaService.updateTag({ name: 'description', content: 'Scopri chi è Stefano Giammori: sviluppatore appassionato di tecnologia, innovazione e soluzioni digitali. Esperienza in sviluppo web, cloud e automazione.' });
    this.metaService.updateTag({ property: 'og:title', content: 'Chi sono - Stefano Giammori' });
    this.metaService.updateTag({ property: 'og:description', content: 'Scopri chi è Stefano Giammori: sviluppatore appassionato di tecnologia, innovazione e soluzioni digitali.' });
    this.metaService.updateTag({ property: 'og:type', content: 'profile' });
    this.metaService.updateTag({ property: 'og:image', content: 'https://raw.githubusercontent.com/sgiammori/photoShoots/refs/heads/main/android_logo_storicoapp_fb.png' });
    this.metaService.updateTag({ property: 'og:url', content: environment.baseUrl + '/who' });
    if (isPlatformBrowser(this.platformId)) {
      const existing = this.doc.querySelector('link[rel="canonical"]');
      if (existing) existing.remove();
      const canonical: HTMLLinkElement = this.doc.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      canonical.setAttribute('href', environment.baseUrl + '/oltreCodice');
      this.doc.head.appendChild(canonical);
    }
  }
}
