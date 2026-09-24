import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { environment } from '../../shared/environments';

@Component({
  selector: 'app-oltre-codice',
  standalone: true,
  imports: [RouterLink, RouterOutlet],
  templateUrl: './oltreCodice.html',
  styleUrl: './oltreCodice.css',
  providers: [Title, Meta]
})
export class OltreCodice {
  constructor(
    private titleService: Title,
    private metaService: Meta,
    @Inject(PLATFORM_ID) private platformId: Object,
    @Inject(DOCUMENT) private doc: Document
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.titleService.setTitle('Oltre il codice - Stefano Giammori');
      this.metaService.updateTag({ name: 'description', content: 'Oltre il codice: scopri la vita fuori dallo schermo di Stefano Giammori — documenti e l\'orto di casa.' });
      this.metaService.updateTag({ property: 'og:title', content: 'Oltre il codice - Stefano Giammori' });
      this.metaService.updateTag({ property: 'og:description', content: 'Documenti, orto e vita oltre lo schermo.' });
      this.metaService.updateTag({ property: 'og:type', content: 'website' });
      this.metaService.updateTag({ property: 'og:image', content: 'https://raw.githubusercontent.com/sgiammori/photoShoots/refs/heads/main/android_logo_storicoapp_fb.png' });
      this.metaService.updateTag({ property: 'og:url', content: environment.baseUrl + '/oltreCodice' });
      this.metaService.updateTag({ name: 'robots', content: 'index, follow' });

      const existing = this.doc.querySelector('link[rel="canonical"]');
      if (existing) existing.remove();
      const canonical: HTMLLinkElement = this.doc.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      canonical.setAttribute('href', environment.baseUrl + '/oltreCodice');
      this.doc.head.appendChild(canonical);
    }
  }
}
