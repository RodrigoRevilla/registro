import { Component } from '@angular/core';
import { AuthService } from '../auth';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <header *ngIf="auth.isLoggedIn() && !esLogin()" class="header-bar">
      <span>Hola, {{ auth.getNombre() }} ({{ auth.getRol() }})</span>
      <button class="btn-salir" (click)="logout()">
        <mat-icon>logout</mat-icon>
        Cerrar sesión
      </button>
    </header>
  `,
  styleUrls: ['./header.scss']
})
export class HeaderComponent {
  constructor(public auth: AuthService, private router: Router) {}

  esLogin(): boolean {
    return this.router.url === '/login';
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}