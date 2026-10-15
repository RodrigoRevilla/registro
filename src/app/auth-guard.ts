import { Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router } from '@angular/router';
import { AuthService, Modulo } from './auth';
import { AvisosService } from './avisos';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  private readonly avisos = inject(AvisosService);
  constructor(private auth: AuthService, private router: Router) { }

  canActivate(route: ActivatedRouteSnapshot): boolean {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login']);
      return false;
    }

    const modulo = route.data?.['modulo'] as Modulo | undefined;
    if (modulo && !this.auth.puedeVer(modulo)) {
      this.avisos.aviso('Tu rol no tiene acceso a ese módulo.');
      this.router.navigate(['/home']);
      return false;
    }

    return true;
  }
}