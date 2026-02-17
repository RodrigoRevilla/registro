import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../http';
import { AuthService } from '../auth';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-certificacion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './certificacion.html',
  styleUrls: ['./certificacion.scss'],
})
export class CertificacionComponent implements OnInit {

  solicitudId!: number;
  folio: string = '';
  actosRegistrales: any[] = [];
  urlPagoPdf: SafeResourceUrl | null = null;
  folioGenerado: string | null = null;
  lineaCaptura: string | null = null;
  urlPdf: string | null = null;
  procesando: boolean = false;

  datosSolicitud = {
    acto_registral_id: 1,
    tipo_servicio_id: 1,
    ventanilla_id: 1,
    fecha_entrega_resultado: '2026-02-20T00:00:00Z',
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
    private authService: AuthService,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    this.cargarActosRegistrales();
  }

  cargarActosRegistrales(): void {
    const token = this.authService.getToken();
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    this.apiService.getActosRegistrales().subscribe({
      next: (response) => {
        if (response.ok) {
          this.actosRegistrales = response.data;
        }
      },
      error: (error) => {
        console.error('Error al cargar actos registrales', error);
      }
    });
  }

  crearNuevaSolicitud(): void {

    console.log('Payload enviado:', JSON.stringify(this.datosSolicitud, null, 2));

    this.apiService.crearSolicitud(this.datosSolicitud).subscribe({
      next: (response) => {
        console.log('Respuesta backend:', response);
      },
      error: (error) => {
        console.log('Error backend completo:', error.error);
      }
    });
  }



  consultarPago(): void {
    this.apiService.getPago(this.solicitudId).subscribe({
      next: (response) => {
        if (response.ok) {
          const url = response.data.url_pdf;
          this.urlPagoPdf = this.sanitizer.bypassSecurityTrustResourceUrl(url);
        }
      },
      error: (error) => {
        console.error('Error al consultar pago', error);
      }
    });
  }

  imprimir(): void {
    window.print();
  }

  goHome(): void {
    this.router.navigate(['/home']);
  }
}
