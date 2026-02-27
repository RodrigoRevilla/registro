import { Component, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';

import { ApiService } from '../http';
import { AuthService } from '../auth';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';



@Component({
  selector: 'app-certificacion',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
  ],
  templateUrl: './certificacion.html',
  styleUrls: ['./certificacion.scss'],
})
export class CertificacionComponent implements OnInit {

  mostrarPdf    = false;
  procesando    = false;
  urlPdf:        string | null = null;
  folioGenerado: string | null = null;
  lineaCaptura:  string | null = null;
  actosRegistrales: any[] = [];
  tiposServicio:    any[] = [];
  entidadCodigo    = '';  entidadNombre    = '';
  distritoCodigo   = '';  distritoNombre   = '';
  municipioCodigo  = '';  municipioNombre  = '';
  localidadCodigo  = '';  localidadNombre  = '';
  foja = '';  oficialia = '';  acta = '';  enDoc = '';
  fechaActa = '';  anioActa = '';
  nombreRegistrado  = '';  crip = '';
  entidadNacCodigo  = '';  entidadNacNombre  = '';
  municipioNacCodigo= '';  municipioNacNombre= '';
  distritoNacCodigo = '';  distritoNacNombre = '';
  localidadNacCodigo= '';  localidadNacNombre= '';
  padre = '';  madre = '';
  tipoServicioId    = 1;
  documentoPresentado = '';
  copiasSOlicitadas = 1;
  aniosBusqueda = '';  rangoBusqueda = '';
  today: string = new Date().toISOString().split('T')[0];
  fechaEntrega = '';  horaEntrega = '';
  nombreContribuyente = '';
  usoCfdi = '';  rfc = '';  regimenFiscal = '';
  email = '';  codigoPostal = '';
  tipoCondonado = '';
  numeroOficio = '';  fechaOficio = '';
  reciboNumero = '';  fechaPagoRecibo = '';

  observaciones = '';

  constructor(
    private router:      Router,
    private apiService:  ApiService,
    private authService: AuthService,
    private ngZone:      NgZone,
    private cdr:         ChangeDetectorRef,
  ) { }

  ngOnInit(): void {
    if (!this.authService.getToken()) {
      this.router.navigate(['/login']);
      return;
    }
    this.cargarCatalogos();
  }

  private cargarCatalogos(): void {
    this.apiService.getActosRegistrales().subscribe({
      next: resp => { if (resp.ok) this.actosRegistrales = resp.data; },
      error: err  => console.error('Error actos registrales:', err.status),
    });
    this.apiService.getTiposServicio().subscribe({
      next: resp => { if (resp.ok) this.tiposServicio = resp.data; },
      error: err  => console.error('Error tipos de servicio:', err.status),
    });
  }

  crearNuevaSolicitud(): void {
    if (!this.fechaEntrega) { alert('Falta la Fecha de Entrega.'); return; }

    const [anio, mes, dia] = this.fechaEntrega.split('-').map(Number);
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    if (new Date(anio, mes - 1, dia) < hoy) {
      alert('La Fecha de Entrega no puede ser anterior a hoy.'); return;
    }

    this.procesando   = true;
    this.mostrarPdf   = false;
    this.urlPdf       = null;
    this.folioGenerado = null;
    this.lineaCaptura  = null;

    const payload = {
      acto_registral_id:        1,
      tipo_servicio_id:         Number(this.tipoServicioId),
      ventanilla_id:            1,
      fecha_entrega_resultado:  `${this.fechaEntrega}T00:00:00Z`,
      nombre_contribuyente:     this.nombreContribuyente || '',
      rfc:                      this.rfc          || '',
      email:                    this.email        || '',
      codigo_postal:            this.codigoPostal || '',
      uso_cfdi:                 this.usoCfdi      || '',
      regimen_fiscal:           this.regimenFiscal || '',
    };

    this.apiService.crearSolicitud(payload).subscribe({
      next: response => {
        const url = response?.data?.linea_pago?.url_pdf;

        this.ngZone.run(() => {
          this.procesando    = false;
          this.folioGenerado = response?.data?.solicitud?.folio ?? null;
          this.lineaCaptura  = response?.data?.pago?.referencia_pago ?? null;
          this.cdr.detectChanges();

          if (url) {
            this.urlPdf     = url;
            this.mostrarPdf = true;
            const ventana = window.open(url, '_blank', `width=${screen.width},height=${screen.height},top=0,left=0`);
            ventana?.addEventListener('load', () => ventana.print());
          } else {
            alert('Solicitud creada pero no se recibió URL del PDF. Verifica con Finanzas.');
          }

        });
      },
      error: err => {
        this.ngZone.run(() => {
          this.procesando = false;
          this.cdr.detectChanges();
          const code = err?.error?.error?.code;
          alert(code === 'ERROR_FINANZAS'
            ? 'Error de conexión con Finanzas'
            : err?.error?.error?.message ?? 'Error desconocido');
        });
      },
    });
  }

  autoFechaEntrega(): void {
    if (!this.fechaEntrega) this.fechaEntrega = this.today;
  }

  autoHoraEntrega(): void {
    if (!this.horaEntrega) return;
    const [horas, minutos] = this.horaEntrega.split(':').map(Number);
    if (horas < 12) {
      const pm = horas + 12;
      this.horaEntrega = `${pm.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
    }
  }

  copiarFolio(): void {
    if (this.folioGenerado) navigator.clipboard.writeText(this.folioGenerado);
  }

  copiarLineaCaptura(): void {
    if (this.lineaCaptura) navigator.clipboard.writeText(this.lineaCaptura);
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