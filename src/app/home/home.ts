import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { AuthService } from '../auth';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinner,
    MatMenuModule
  ],
  templateUrl: './home.html',
  styleUrls: ['./home.scss'],
})
export class HomeComponent implements OnInit {
  isLoggedIn: boolean = false;
  constructor(
    private router: Router,
    public authService: AuthService
  ) { }

  ngOnInit(): void {
    this.isLoggedIn = this.authService.isLoggedIn();

    if (!this.isLoggedIn) {
      this.router.navigate(['/login'])
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login'])
  }

  navegarA(ruta: string) {
    this.router.navigate([ruta]);
  }

  irANacimiento(event: MouseEvent) {
    event?.stopImmediatePropagation();
    this.router.navigate(['/nacimiento']);
  }

  irATrabajo(event: MouseEvent) {
    event?.stopImmediatePropagation();
    this.router.navigate(['/trabajo']);
  }

  irABusqueda(event: MouseEvent) {
    event?.stopImmediatePropagation();
    this.router.navigate(['/busqueda']);
  }

  irAModificacion(event: Event) {
    event.stopPropagation();
    this.router.navigate(['/modificacion']);
  }

  irAActualizarPago(event: Event): void {
    event.preventDefault();
    this.router.navigate(['/actualizar']);
  }
}

