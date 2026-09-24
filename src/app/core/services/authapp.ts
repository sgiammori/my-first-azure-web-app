import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class Authapp {

  private readonly sessionStorage = inject(DOCUMENT)?.defaultView?.sessionStorage;

  autentica = (userid: string, password: string): boolean => {
    var retVal = (userid === 'admin' && password === 'admin') ? true : false;

    if (retVal) {
      this.setItem("Utente", userid);
    }

    return retVal;
  }

  // Set item in local storage
  setItem(key: string, value: any): void {
    this.sessionStorage?.setItem(key, value);
  }
  // Get item from local storage
  getItem(key: string): string | null {
    return (this.sessionStorage?.getItem(key)) ? (this.sessionStorage?.getItem(key)) : "";
  }

  loggedUser = (): string | null => (this.getItem("Utente")) ? this.getItem("Utente") : "";

  isLogged = (): boolean => (this.getItem("Utente")) ? true : false;

  clearUser = (): void => this.sessionStorage?.removeItem("Utente");

  clearAll = (): void => this.sessionStorage?.clear();

}
