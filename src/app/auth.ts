import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export const ROLES_EDICION_NACIMIENTO = ['ADMINISTRADOR', 'VALIDADOR'];

export type Modulo = 'atencion' | 'buscadores' | 'pagos' | 'certificaciones' | 'reimpresion' | 'entrega';

export const MODULOS_POR_ROL: Record<string, Modulo[]> = {
  OPERADOR_VENTANILLA: ['atencion'],
};

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private tokenKey = 'token';
  private usuarioKey = 'usuario';

  constructor(@Inject(PLATFORM_ID) private platformId: Object) { }

  login(token: string, usuario: any) {
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.setItem(this.tokenKey, token);
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
    if (isPlatformBrowser(this.platformId)) {
      return !!sessionStorage.getItem(this.tokenKey);
    }
    return false;
  }

  getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return sessionStorage.getItem(this.tokenKey);
    }
    return null;
  }

  getUsuario(): any {
    if (isPlatformBrowser(this.platformId)) {
      const u = sessionStorage.getItem(this.usuarioKey);
      return u ? JSON.parse(u) : null;
    }
    return null;
  }

  getNombre(): string {
    const usuario = this.getUsuario();
    return usuario ? `${usuario.nombre} ${usuario.apellido_paterno}` : '';
  }

  getRol(): string {
    const usuario = this.getUsuario();
    return usuario?.rol?.nombre ?? '';
  }

  getRolClave(): string {
    const usuario = this.getUsuario();
    return usuario?.rol?.clave ?? '';
  }

  tieneRol(...claves: string[]): boolean {
    const rol = `${this.getRolClave() ?? ''}`.trim().toUpperCase();
    return !!rol && claves.some(c => c.toUpperCase() === rol);
  }

  puedeEditarNacimientos(): boolean {
    return this.isLoggedIn() && this.tieneRol(...ROLES_EDICION_NACIMIENTO);
  }

  puedeVer(modulo: Modulo): boolean {
    if (!this.isLoggedIn()) return false;
    const rol = `${this.getRolClave() ?? ''}`.trim().toUpperCase();
    const permitidos = MODULOS_POR_ROL[rol];
    return !permitidos || permitidos.includes(modulo);
  }

  hasPermiso(clave: string): boolean {
    const usuario = this.getUsuario();
    return usuario?.permisos?.some((p: any) => p.clave === clave) ?? false;
  }
}