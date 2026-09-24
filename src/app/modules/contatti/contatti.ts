import { Component, DOCUMENT, Inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../shared/environments';

@Component({
  selector: 'app-contatti',
  standalone: true,
  imports: [],
  templateUrl: './contatti.html',
  styleUrl: './contatti.css',
  providers: [Title, Meta]
})

export class Contatti {

  constructor(private titleService: Title, private metaService: Meta, @Inject(PLATFORM_ID) private platformId: Object, @Inject(DOCUMENT) private doc: Document) {
      this.titleService.setTitle('Contatti | Stefano Giammori | Richiedi Informazioni o Preventivi');
      this.metaService.updateTag({ name: 'description', content: 'Contatta Stefano Giammori per informazioni, collaborazioni o preventivi su progetti digitali. Risposta rapida e consulenza personalizzata.' });
      this.metaService.updateTag({ property: 'og:title', content: 'Contatti - Stefano Giammori' });
      this.metaService.updateTag({ property: 'og:description', content: 'Contatta Stefano Giammori per informazioni, collaborazioni o preventivi su progetti digitali.' });
      this.metaService.updateTag({ property: 'og:type', content: 'profile' });
      this.metaService.updateTag({ property: 'og:image', content: 'https://raw.githubusercontent.com/sgiammori/photoShoots/refs/heads/main/android_logo_storicoapp_fb.png' });
      this.metaService.updateTag({ property: 'og:url', content: environment.baseUrl + '/contatti' });

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
