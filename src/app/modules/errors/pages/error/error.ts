import { isPlatformBrowser } from '@angular/common';
import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

@Component({
  selector: 'app-error',
  standalone: true,
  imports: [],
  templateUrl: './error.html',
  styleUrl: './error.css',
  providers: [Title, Meta]
})

export class Error {

  constructor(private titleService: Title, private metaService: Meta, @Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      this.titleService.setTitle('Pagina non trovata | Stefano Giammori');
      this.metaService.updateTag({ name: 'description', content: 'La pagina che cerchi non esiste. Torna alla home o contattami per assistenza.' });
      this.metaService.updateTag({ property: 'og:title', content: '404 - Stefano Giammori' });
      this.metaService.updateTag({ property: 'og:description', content: 'La pagina che cerchi non esiste.' });
      this.metaService.updateTag({ property: 'og:type', content: 'profile' });
      this.metaService.updateTag({ property: 'og:image', content: 'https://raw.githubusercontent.com/sgiammori/photoShoots/refs/heads/main/android_logo_storicoapp_fb.png' });
      this.metaService.updateTag({ property: 'og:url', content: 'https://lively-ground-0e9634903.4.azurestaticapps.net/error' });
    }
  }
}
