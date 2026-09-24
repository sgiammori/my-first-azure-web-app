// Dichiara la variabile globale FB per TypeScript
declare const FB: any;
import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, concatMap, from, EMPTY, of, map, finalize } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../shared/environments';
import { IAccount } from '../../shared/models/IAccount';
import { fb } from '../../types/fn';

const baseUrl = `${environment.apiUrl}/accounts`;

@Injectable({
  providedIn: 'root'
})
export class FacebookaccountService {
  private accountSubject: BehaviorSubject<IAccount> = new BehaviorSubject<IAccount>({} as IAccount);
  public account: Observable<IAccount>;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient
  ) {
    this.account = this.accountSubject.asObservable();
  }

  public get accountValue(): IAccount {
    return this.accountSubject.value;
  }


  login() {
    // login with facebook then authenticate with the API to get a JWT auth token
    this.facebookLogin()
      .pipe(
        concatMap((accessToken: string | undefined) => {
          if (!accessToken) {
            // Gestione errore: accessToken mancante
            alert('Login Facebook fallito o permessi insufficienti.');
            return EMPTY;
          }
          return this.apiAuthenticate(accessToken);
        })
      )
      .subscribe({
        next: () => {
          // get return url from query parameters or default to home page
          const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
          this.router.navigateByUrl(returnUrl);
        },
        error: (err) => {
          alert('Errore autenticazione API: ' + (err?.error?.message || err));
        }
      });
  }

  facebookLogin() {
    // login with facebook and return observable with fb access token on success
    // Richiedi permessi espliciti: aggiungi qui quelli necessari per la tua app
    const scope = 'public_profile,email,pages_manage_posts,pages_read_engagement';
    return from(new Promise<fb.StatusResponse>(resolve => FB.login(resolve, { scope })))
      .pipe(
        concatMap(({ authResponse }) => {
          if (!authResponse) {
            alert('Permessi Facebook non concessi o login annullato.');
            return EMPTY;
          }
          return of(authResponse.accessToken);
        })
      );
  }

  apiAuthenticate(accessToken: string) {
    // authenticate with the api using a facebook access token,
    // on success the api returns an account object with a JWT auth token
    return this.http.post<any>(`${baseUrl}/authenticate`, { accessToken })
      .pipe(map(account => {
        if (!account || !account.token) {
          throw new Error('Autenticazione API fallita: token mancante.');
        }
        this.accountSubject.next(account);
        this.startAuthenticateTimer();
        return account;
      }));
  }

  logout() {
    // revoke app permissions to logout completely because FB.logout() doesn't remove FB cookie
    FB.api('/me/permissions', 'delete', {} , () => FB.logout());
    this.stopAuthenticateTimer();
    this.accountSubject.next({} as IAccount);
    this.router.navigate(['/login']);
  }

  getAll() {
    return this.http.get<IAccount[]>(baseUrl);
  }

  getById(id: any) {
    return this.http.get<IAccount>(`${baseUrl}/${id}`);
  }

  update(id: any, params: any) {
    return this.http.put(`${baseUrl}/${id}`, params)
      .pipe(map((account: any) => {
        // update the current account if it was updated
        if (account.id === this.accountValue.id) {
          // publish updated account to subscribers
          account = { ...this.accountValue, ...account };
          this.accountSubject.next(account);
        }
        return account;
      }));
  }

  delete(id: string) {
    return this.http.delete(`${baseUrl}/${id}`)
      .pipe(finalize(() => {
        // auto logout if the logged in account was deleted
        if (id === this.accountValue.id)
          this.logout();
      }));
  }

  // helper methods

  private authenticateTimeout : any;

  private startAuthenticateTimer() {
    // parse json object from base64 encoded jwt token
    if (!this.accountValue.token) return;
    let jwtToken: any;
    try {
      jwtToken = JSON.parse(atob(this.accountValue.token.split('.')[1]));
    } catch (e) {
      return;
    }
    // set a timeout to re-authenticate with the api one minute before the token expires
    const expires = new Date(jwtToken.exp * 1000);
    const timeout = expires.getTime() - Date.now() - (60 * 1000);
    const accessToken = FB.getAuthResponse();
    if (timeout > 0) {
      this.authenticateTimeout = setTimeout(() => {
        this.apiAuthenticate(accessToken?.accessToken ? accessToken?.accessToken : "" ).subscribe();
      }, timeout);
    }
  }

  private stopAuthenticateTimer() {
    // cancel timer for re-authenticating with the api
    clearTimeout(this.authenticateTimeout);
  }
}
