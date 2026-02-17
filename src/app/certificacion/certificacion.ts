import { Component, OnInit, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../http';
import { AuthService } from '../auth';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
  folioGenerado: string | null = null;
  lineaCaptura: string | null = null;
  urlPdf: string | null = null;
  mostrarPdf: boolean = false;
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
    private ngZone: NgZone
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
    this.apiService.crearSolicitud(this.datosSolicitud).subscribe({
      next: (response) => {
        const url = response.data.linea_pago.url_pdf;
        this.ngZone.run(() => {
          this.urlPdf = url;
          this.mostrarPdf = true;
          const ventana = window.open(url, '_blank', `width=${screen.width},height=${screen.height},top=0,left=0`);
          ventana?.addEventListener('load', () => ventana.print());
        });
      },
      error: (error) => {
        console.log('Error backend completo:', error.error);
      }
    });
  }

  imprimir(): void {
    if (this.urlPdf) {
      const ventana = window.open(this.urlPdf, '_blank', 'width=900,height=700');
      ventana?.addEventListener('load', () => ventana.print());
    }
  }

  goHome(): void {
    this.router.navigate(['/home']);
  }
}