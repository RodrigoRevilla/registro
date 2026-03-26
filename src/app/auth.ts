import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

// ── MOCK MODE — revertir cuando el backend esté disponible ──────────────────
const MOCK_TOKEN   = 'mock-token-dev';
const MOCK_USUARIO = {
  id: 1,
  username: 'admin',
  nombre: 'Admin',
  apellido_paterno: 'Sistema',
  apellido_materno: '',
  area_id: 5,
  rol_id: 6,
  activo: true,
  rol: { id: 6, clave: 'ADMINISTRADOR', nombre: 'Administrador', area_id: 5, activo: true },
  permisos: [
    { id: 1, clave: 'RECEPCION',   nombre: 'Recepción de solicitudes' },
    { id: 2, clave: 'IMPRESION',   nombre: 'Impresión de certificaciones' },
    { id: 3, clave: 'ENTREGA',     nombre: 'Entrega de documentos' },
    { id: 4, clave: 'CANCELACION', nombre: 'Cancelación de solicitudes' },
  ],
};
// ── FIN MOCK ─────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class AuthService {
  private tokenKey   = 'token';
  private usuarioKey = 'usuario';

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  login(token: string, usuario: any) {
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.setItem(this.tokenKey,   token);
      sessionStorage.setItem(this.usuarioKey, JSON.stringify(usuario));
    }
  }

  logout() {
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.removeItem(this.tokenKey);
      sessionStorage.removeItem(this.usuarioKey);
    }
  }

  isLoggedIn(): boolean {
    return true; // ── MOCK
  }

  getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return sessionStorage.getItem(this.tokenKey) ?? MOCK_TOKEN;
    }
    return MOCK_TOKEN;
  }

  getUsuario(): any {
    if (isPlatformBrowser(this.platformId)) {
      const u = sessionStorage.getItem(this.usuarioKey);
      return u ? JSON.parse(u) : MOCK_USUARIO;
    }
    return MOCK_USUARIO;
  }

  getNombre(): string {
    const usuario = this.getUsuario();
    return usuario ? `${usuario.nombre} ${usuario.apellido_paterno}` : '';
  }

  getRol(): string {
    return this.getUsuario()?.rol?.nombre ?? '';
  }

  getRolClave(): string {
    return this.getUsuario()?.rol?.clave ?? '';
  }

  hasPermiso(clave: string): boolean {
    return this.getUsuario()?.permisos?.some((p: any) => p.clave === clave) ?? false;
  }
}