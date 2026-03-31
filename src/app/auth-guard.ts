import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from './auth';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) { }

  canActivate(): boolean {
    console.log('AUTH GUARD ACTIVADO');
    console.log('Token desde Guard:', this.auth.getToken());
    console.log('isLoggedIn desde Guard:', this.auth.isLoggedIn()); 
    
    const isLoggedIn = this.auth.isLoggedIn();
    console.log('¿Usuario autenticado?', isLoggedIn);
    
    if (isLoggedIn) {
      console.log('Acceso permitido');
      return true;
    } else {
      console.log('No autenticado, redirigiendo al login');
      this.router.navigate(['/login']);
      return false;
    }
  }
}