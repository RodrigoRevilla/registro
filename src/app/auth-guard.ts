import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from './auth';

// ── MOCK MODE — revertir cuando el backend esté disponible ──────────────────

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): boolean {
    return true; // ── MOCK: bypass auth — revertir cuando el backend esté disponible
  }
}

// ── FIN MOCK ─────────────────────────────────────────────────────────────────
// Versión producción:
//
// canActivate(): boolean {
//   if (this.auth.isLoggedIn()) return true;
//   this.router.navigate(['/login']);
//   return false;
// }