import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../http';
import { AuthService } from '../auth';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-certificacion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './certificacion.html',
  styleUrls: ['./certificacion.scss'],
})
export class CertificacionComponent implements OnInit {
  solicitudId: number = 42;
  folio: string = 'HV-2026-001234';
  actosRegistrales: any[] = [];
  selectedActo: any;

  datosSolicitud = {
    acto_registral_id: 1,
    tipo_servicio_id: 1,
    ventanilla_id: 1,
    fecha_entrega_resultado: '2026-02-15',
    nombre_contribuyente: 'JUAN PEREZ LOPEZ',
    rfc: 'XAXX010101000',
    email: 'juan@example.com',
    codigo_postal: '68000',
    uso_cfdi: 'S01',
    regimen_fiscal: '616'
  };

  constructor(
    private router: Router,
    private apiService: ApiService,
    private authService: AuthService
  ) {
    console.log('=== CONSTRUCTOR CERTIFICACIÓN ===');
    console.log('authService inyectado:', this.authService);
    console.log('Token desde constructor:', this.authService.getToken());
    console.log('¿Está logueado desde constructor?', this.authService.isLoggedIn());
    console.log('authService inyectado:', this.authService);
  }

  ngOnInit(): void {
    console.log('=== DIAGNÓSTICO CERTIFICACIÓN ===');
    console.log('Token:', this.authService.getToken());
    console.log('¿Está logueado?', this.authService.isLoggedIn());
    console.log('Usuario:', this.authService.getUsuario());

    this.cargarActosRegistrales();
  }

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

  crearNuevaSolicitud(): void {
    console.log('Creando nueva solicitud...');

    const token = this.authService.getToken();
    if (!token) {
      console.log('Token no disponible, redirigiendo al login');
      this.router.navigate(['/login']);
      return;
    }

    this.apiService.crearSolicitud(this.datosSolicitud)
      .subscribe(
        (response) => {
          if (response.ok) {
            console.log('Solicitud creada exitosamente:', response.data);
            this.solicitudId = response.data.solicitud.id;
            this.folio = response.data.solicitud.folio;

            console.log('ID de solicitud:', this.solicitudId);
            console.log('Folio:', this.folio);
            console.log('Referencia de pago:', response.data.pago.referencia_pago);
            console.log('URL PDF:', response.data.pago.url_pdf);
          } else {
            console.error('Error en la respuesta al crear solicitud');
          }
        },
        (error) => {
          console.error('Error al crear solicitud', error);
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
    }, 500);
  }

  goHome(): void {
    this.router.navigate(['/home']);
  }
}