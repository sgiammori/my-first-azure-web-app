import { Injectable, inject } from '@angular/core';
import { Authapp } from './authapp';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, CanActivateFn } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class RouteGuard {
  constructor(private BasicAuth: Authapp, private route: Router) { }

  canActivate(next: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    if (!this.BasicAuth.isLogged()) {
      console.log("Accesso NON Consentito");
      this.route.navigate(['login'], { queryParams: { nologged: true } });
      return false;
    } else {
      return true;
    }
  }
}

export const AuthGuard: CanActivateFn = (next: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean => {
  return inject(RouteGuard).canActivate(next, state);
};
