import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { environment } from '../../../../shared/environments';

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [],
  templateUrl: './documents.html',
  styleUrl: './documents.css',
  providers: [Title, Meta]
})
export class Documents {
  constructor(
    private titleService: Title,
    private metaService: Meta,
    @Inject(PLATFORM_ID) private platformId: Object,
    @Inject(DOCUMENT) private doc: Document
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.titleService.setTitle('Oltre il codice - Stefano Giammori | Sviluppatore Web & Mobile');
      this.metaService.updateTag({ name: 'description', content: 'Documenti del Colossus' });
      this.metaService.updateTag({ property: 'og:title', content: 'Oltre il codice - Stefano Giammori' });
      this.metaService.updateTag({ property: 'og:description', content: 'Documenti del Colossus' });
      this.metaService.updateTag({ property: 'og:type', content: 'profile' });
      this.metaService.updateTag({ property: 'og:image', content: 'https://raw.githubusercontent.com/sgiammori/photoShoots/refs/heads/main/android_logo_storicoapp_fb.png' });
      this.metaService.updateTag({ property: 'og:url', content: environment.baseUrl + '/oltreCodice' });
      this.metaService.updateTag({ name: 'robots', content: 'noindex, follow' });

      const existing = this.doc.querySelector('link[rel="canonical"]');
      if (existing) existing.remove();
      const canonical: HTMLLinkElement = this.doc.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      canonical.setAttribute('href', environment.baseUrl + '/oltreCodice');
      this.doc.head.appendChild(canonical);
    }
  }
}
