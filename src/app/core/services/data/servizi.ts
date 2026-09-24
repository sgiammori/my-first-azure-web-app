import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../shared/environments';
import { isPlatformBrowser } from '@angular/common';
import { of } from 'rxjs';
import { WINDOW } from '../../../shared/window';

@Injectable({
  providedIn: 'root',
})
export class Servizi {
  //port: string = environment.port;

  constructor(
    @Inject(WINDOW) private window: Window,
    private httpClient: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  getServizi = () => {
    if (isPlatformBrowser(this.platformId)) {
      // Only call API in browser
      if (typeof window !== 'undefined' && this.window.location.href.includes('localhost'))
        return this.httpClient.get('/api/trigger');
      else
        return this.httpClient.get(environment.funcUrl + '/api/trigger');
    } else {
      // SSR: return empty or mock data, or skip
      return of([]);
    }
  }

  /*getServiziByCode = (codart: string) => {
    return this.httpClient.get<IServizi>(`http://${this.server}:${this.port}/api/servizi/cerca/codice/${codart}`)
      .pipe(
        map(response => {
          (response as IServizi).idStatoArt = this.getDesStatoArt((response as IServizi).idStatoArt);
          return response as IServizi;
        })
      );
  }

  getServiziByEan = (barcode: string) => {
    return this.httpClient.get<IServizi>(`http://${this.server}:${this.port}/api/servizi/cerca/barcode/${barcode}`)
      .pipe(
        map(response => {
          (response as IServizi).idStatoArt = this.getDesStatoArt((response as IServizi).idStatoArt);
          return response as IServizi;
        })
      );
  }

  getDesStatoArt = (idStato: string): string => {

    if (idStato === '1')
      return 'Attivo'
    else if (idStato === '2')
      return 'Sospeso'
    else
      return 'Eliminato'
  }*/



}
