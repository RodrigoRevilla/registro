import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private tokenKey = 'token';
  private usuarioKey = 'usuario';

  constructor(@Inject(PLATFORM_ID) private platformId: Object) { }

  login(token: string, usuario: any) {
    if (isPlatformBrowser(this.platformId)) {
      console.log('Guardando token:', token);
      localStorage.setItem(this.tokenKey, token);
      localStorage.setItem(this.usuarioKey, JSON.stringify(usuario));
    }
  }

  logout() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.usuarioKey);
    }
  }

  isLoggedIn(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem(this.tokenKey);
      console.log('Token en isLoggedIn:', token);  
      return !!token;  
    }
    return false;
  }
  

  getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem(this.tokenKey);
      console.log('Token obtenido:', token);
      return token;
    }
    return null;
  }
  getUsuario(): any {
    if (isPlatformBrowser(this.platformId)) {
      const u = localStorage.getItem(this.usuarioKey);
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
    return usuario?.rol?.nombre || '';
  }

  hasPermiso(clave: string): boolean {
    const usuario = this.getUsuario();
    return usuario?.permisos?.some((p: any) => p.clave === clave) ?? false;
  }
}
