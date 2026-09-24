import { Component, DOCUMENT, Inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser, isPlatformServer } from '@angular/common';
import { environment } from '../../shared/environments';
import { Meta, Title } from '@angular/platform-browser';
import { WINDOW } from '../../shared/window';

@Component({
  selector: 'app-itechblog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './itechblog.html',
  styleUrl: './itechblog.css',
  providers: [Title, Meta]
})
export class ItechBlog implements OnInit {
  rssItems = signal<any[]>([]);
  loading = signal(true);
  error = signal('');

  constructor(@Inject(WINDOW) public window: Window, @Inject(PLATFORM_ID) private platformId: Object, private titleService: Title, private metaService: Meta, @Inject(DOCUMENT) private doc: Document) {
    this.titleService.setTitle('Blog | Novità, Tutorial e Approfondimenti | Tom\'s Hardware Italia');
    this.metaService.updateTag({ name: 'description', content: 'Il blog ITech di Tom\'s Hardware Italia per chi vuole restare aggiornato.' });
    this.metaService.updateTag({ property: 'og:title', content: 'Blog - Tom\'s Hardware Italia' });
    this.metaService.updateTag({ property: 'og:description', content: 'Il blog ITech di Tom\'s Hardware Italia per chi vuole restare aggiornato.' });
    this.metaService.updateTag({ property: 'og:type', content: 'profile' });
    this.metaService.updateTag({ property: 'og:image', content: 'https://raw.githubusercontent.com/sgiammori/photoShoots/refs/heads/main/android_logo_storicoapp_fb.png' });
    this.metaService.updateTag({ property: 'og:url', content: environment.baseUrl + '/itechblog' });
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
    let url: string;
    if(typeof window !== 'undefined' && this.window.location.href.includes('localhost'))
      url = '/api/itechnews';
    else
      url = environment.funcUrl + '/api/itechnews';
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error('Errore di rete');
        return res.json();
      })
      .then(data => {
        console.log('Fetched RSS items:', JSON.stringify(data, null, 2));
        this.rssItems.set(data || []);
        this.loading.set(false);
      })
      .catch(err => {
        this.error.set('Impossibile caricare il feed.');
        this.loading.set(false);
      });
  }
}
