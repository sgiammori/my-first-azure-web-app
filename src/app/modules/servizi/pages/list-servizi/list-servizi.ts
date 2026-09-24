import { CommonModule } from '@angular/common';
import { AfterViewChecked, AfterViewInit, ChangeDetectorRef, Component, DOCUMENT, effect, OnInit, signal } from '@angular/core';
// Updated IServizi for Play Store app model
export interface IServizi {
  ogTitle: string;
  ogImage: string;
  ogUrl: string;
}
import { Servizi } from '../../../../core/services/data/servizi';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { NgxPaginationModule } from 'ngx-pagination';
import { of } from 'rxjs/internal/observable/of';
import { Observable } from 'rxjs/internal/Observable';
import { map } from 'rxjs/internal/operators/map';
import { FormsModule } from '@angular/forms';
import { sign } from 'crypto';
import { catchError, timeout } from 'rxjs';
import { Meta, Title } from '@angular/platform-browser';
import { Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../../shared/environments';

@Component({
  selector: 'app-list-servizi',
  standalone: true,
  imports: [CommonModule, NgxPaginationModule, FormsModule],
  templateUrl: './list-servizi.html',
  styleUrl: './list-servizi.css',
  providers: [Title, Meta]
})

export class ListServizi {

  servizi$ = signal<IServizi[]>([]);
  errore = signal<string>('');
  pagina: number = 1;
  righe: number = 10;

  constructor(
    private router: Router,
    private serviziService: Servizi,
    private titleService: Title,
    private metaService: Meta,
    @Inject(PLATFORM_ID) private platformId: Object,
    @Inject(DOCUMENT) private doc: Document
  ) {
    this.titleService.setTitle('Servizi - Stefano Giammori | Sviluppatore Web & Mobile');
    this.metaService.updateTag({ name: 'description', content: 'Scopri i servizi offerti da Stefano Giammori: sviluppo web, cloud, automazione e soluzioni digitali.' });
    this.metaService.updateTag({ property: 'og:title', content: 'Servizi - Stefano Giammori' });
    this.metaService.updateTag({ property: 'og:description', content: 'Scopri i servizi offerti da Stefano Giammori: sviluppo web, cloud, automazione e soluzioni digitali.' });
    this.metaService.updateTag({ property: 'og:type', content: 'website' });
    this.metaService.updateTag({ property: 'og:image', content: 'https://raw.githubusercontent.com/sgiammori/photoShoots/refs/heads/main/android_logo_storicoapp_fb.png' });
    this.metaService.updateTag({ property: 'og:url', content: environment.baseUrl + '/listServizi' });
    if (isPlatformBrowser(this.platformId)) {
      const existing = this.doc.querySelector('link[rel="canonical"]');
      if (existing) existing.remove();
      const canonical: HTMLLinkElement = this.doc.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      canonical.setAttribute('href', environment.baseUrl + '/oltreCodice');
      this.doc.head.appendChild(canonical);
    }
    this.loadServizi();
  }

  // Effect to react to servizi$ changes
  loadEffect = effect(() => {
    const servizi = this.servizi$();
    console.log('Servizi updated:', servizi);
    // Place your side effect here, e.g.:
    //console.log('Servizi updated:', servizi);
    // You can call any function here, e.g. this.doSomethingWithServizi(servizi);
  });

  loadServizi() {
    this.serviziService.getServizi().subscribe({
      next: this.handleResponse.bind(this),
      error: this.handleError.bind(this)
    });
  }

  handleResponse = (res: any) => {
    // If res is an array, use it directly; if it's a single object, wrap in array
    this.servizi$.set(Array.isArray(res) ? res : [res]);
  }

  handleError = (error: any) => {
    setTimeout(() => {
      this.errore.set(error.error?.message || error.message || 'Unknown error');
    });
    console.log(this.errore());
  }

}
