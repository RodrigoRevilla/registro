import { Component } from '@angular/core';
import { AuthService } from '../auth';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-header',
  standalone: true, 
  imports: [CommonModule, MatButtonModule],  
  template: `
    <header *ngIf="auth.isLoggedIn()" class="header-bar">
      <span>Hola, {{ auth.getNombre() }} ({{ auth.getRol() }})</span>
      <button mat-button color="warn" (click)="logout()">Salir</button>
    </header>
  `,
  styles: [`
    .header-bar {
      display: flex;
      justify-content: space-between;
      padding: 1rem;
      background-color: #3f51b5;
      color: white;
      align-items: center;
    }
  `]
})
export class HeaderComponent {
  constructor(public auth: AuthService) {}

  logout() {
    this.auth.logout();
    window.location.reload();
  }
}
