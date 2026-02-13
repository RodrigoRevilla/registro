import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../http';
import { AuthService } from '../auth';

@Component({
  selector: 'app-certificacion',
  templateUrl: './certificacion.html',
  styleUrls: ['./certificacion.scss'],
})
export class CertificacionComponent implements OnInit {
  solicitudId: number = 42;
  folio: string = 'HV-2026-001234';
  actosRegistrales: any[] = []; 
  selectedActo: any;

  constructor(private router: Router, private apiService: ApiService, private authService: AuthService) {
    console.log('authService inyectado:', this.authService);
  }

  ngOnInit(): void {
    this.cargarActosRegistrales();
  }

  // ACTOS REGISTRALES
  cargarActosRegistrales(): void {
    const token = this.authService.getToken();
    if (!token) {
      console.log('Token no disponible, redirigiendo al login');
      this.router.navigate(['/login']);
      return;
    }

    this.apiService.getActosRegistrales()
      .subscribe(
        (response) => {
          if (response.ok) {
            this.actosRegistrales = response.data; 
            console.log('Actos registrales cargados:', this.actosRegistrales);
          } else {
            console.error('Error al cargar los actos registrales');
          }
        },
        (error) => {
          console.error('Error al hacer la solicitud GET', error);
        }
      );
  }

  certificar(): void {
    console.log('Método certificar() llamado');

    const token = this.authService.getToken();
    if (!token) {
      console.log('Token no disponible, redirigiendo al login');
      this.router.navigate(['/login']);
      return;
    }

    this.apiService.cambiarEstado(this.solicitudId, 'CERTIFICACION_EMITIDA', '')
      .subscribe(
        (response) => {
          console.log('Certificación emitida exitosamente', response);
          this.registrarImpresion();
        },
        (error) => {
          console.error('Error al certificar la solicitud', error);
        }
      );
  }

  registrarImpresion(): void {
    console.log('Registrando impresión...');
    this.apiService.registrarImpresion(this.solicitudId, this.folio)
      .subscribe(
        (impresionResponse) => {
          console.log('Impresión registrada correctamente', impresionResponse);
          this.imprimir();
        },
        (impresionError) => {
          console.error('Error al registrar impresión', impresionError);
        }
      );
  }

  imprimir(): void {
    console.log('Imprimiendo...');
    setTimeout(() => {
      window.print();
    }, 10000); 
  }

  goHome(): void {
    this.router.navigate(['/home']);
  }
}
