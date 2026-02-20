import { Component, OnInit, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../http';
import { AuthService } from '../auth';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule

 } from '@angular/material/card';
@Component({
  selector: 'app-certificacion',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule],
  templateUrl: './certificacion.html',
  styleUrls: ['./certificacion.scss'],
})
export class CertificacionComponent implements OnInit {

  mostrarPdf = false;
  procesando = false;
  urlPdf: string | null = null;
  actosRegistrales: any[] = [];
  tiposServicio: any[] = [];
  entidadCodigo = '';
  entidadNombre = '';
  distritoCodigo = '';
  distritoNombre = '';
  municipioCodigo = '';
  municipioNombre = '';
  localidadCodigo = '';
  localidadNombre = '';
  foja = '';
  oficialia = '';
  acta = '';
  enDoc = '';
  fechaActa = '';
  anioActa = '';
  nombreRegistrado = '';
  crip = '';
  entidadNacCodigo = '';
  entidadNacNombre = '';
  municipioNacCodigo = '';
  municipioNacNombre = '';
  distritoNacCodigo = '';
  distritoNacNombre = '';
  localidadNacCodigo = '';
  localidadNacNombre = '';
  padre = '';
  madre = '';
  tipoServicioId = 1;
  documentoPresentado = '';
  copiasSOlicitadas = 1;
  aniosBusqueda = '';
  rangoBusqueda = '';
  fechaEntrega = '';
  horaEntrega = '';
  nombreContribuyente = '';
  usoCfdi = '';
  rfc = '';
  regimenFiscal = '';
  email = '';
  codigoPostal = '';
  tipoCondonado = '';
  numeroOficio = '';
  fechaOficio = '';
  reciboNumero = '';
  fechaPagoRecibo = '';
  observaciones = '';

  constructor(
    private router: Router,
    private apiService: ApiService,
    private authService: AuthService,
    private ngZone: NgZone,
  ) { }

  ngOnInit(): void {
    if (!this.authService.getToken()) {
      this.router.navigate(['/login']);
      return;
    }
    this.cargarCatalogos();
  }

  private cargarCatalogos(): void {
    console.log('Cargando catálogos...');

    this.apiService.getActosRegistrales().subscribe({
      next: resp => {
        console.log('Actos registrales:', resp.ok ? resp.data : 'sin datos', resp);
        if (resp.ok) this.actosRegistrales = resp.data;
      },
      error: err => console.error('Error actos registrales:', err.status, err.message),
    });

    this.apiService.getTiposServicio().subscribe({
      next: resp => {
        console.log('Tipos de servicio:', resp.ok ? resp.data : 'sin datos', resp);
        if (resp.ok) this.tiposServicio = resp.data;
      },
      error: err => console.error('Error tipos de servicio:', err.status, err.message),
    });
  }

  crearNuevaSolicitud(): void {
    if (!this.fechaEntrega) {
      alert('Falta la Fecha de Entrega.');
      return;
    }

    const [anio, mes, dia] = this.fechaEntrega.split('-').map(Number);
    const fechaSeleccionada = new Date(anio, mes - 1, dia); // local, sin zona horaria

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    if (fechaSeleccionada < hoy) {
      alert('La Fecha de Entrega no puede ser anterior a hoy.');
      return;
    }
    console.log('Botón presionado — iniciando creación de solicitud');
    console.log('Fecha de entrega:', this.fechaEntrega);
    console.log('Contribuyente:', this.nombreContribuyente || '(vacío → PUBLICO EN GENERAL)');
    console.log('Tipo servicio ID:', this.tipoServicioId);

    this.procesando = true;
    this.mostrarPdf = false;
    this.urlPdf = null;

    const payload = {
      acto_registral_id: 1,
      tipo_servicio_id: Number(this.tipoServicioId),
      ventanilla_id: 1,
      fecha_entrega_resultado: `${this.fechaEntrega}T00:00:00Z`,
      nombre_contribuyente: this.nombreContribuyente || '',
      rfc: this.rfc || '',
      email: this.email || '',
      codigo_postal: this.codigoPostal || '',
      uso_cfdi: this.usoCfdi || '',
      regimen_fiscal: this.regimenFiscal || '',
    };
    console.log('Payload exacto:', JSON.stringify(payload, null, 2));
    console.log('Tipos:', {
      acto: typeof payload.acto_registral_id,
      servicio: typeof payload.tipo_servicio_id,
      ventanilla: typeof payload.ventanilla_id,
      fecha: payload.fecha_entrega_resultado,
    });

    console.log('Enviando payload a la API:', JSON.stringify(payload, null, 2));

    this.apiService.crearSolicitud(payload).subscribe({
      next: response => {
        console.log('Respuesta completa del backend:', response);
        const url = response?.data?.linea_pago?.url_pdf;
        console.log('URL del PDF:', url ?? 'No recibida');
        console.log('Folio generado:', response?.data?.solicitud?.folio ?? 'No recibido');
        console.log('Línea de captura:', response?.data?.pago?.referencia_pago ?? 'No recibida');

        this.ngZone.run(() => {
          this.procesando = false;
          if (url) {
            this.urlPdf = url;
            this.mostrarPdf = true;
            console.log('Abriendo PDF en nueva ventana...');
            const ventana = window.open(url, '_blank', `width=${screen.width},height=${screen.height},top=0,left=0`);
            ventana?.addEventListener('load', () => ventana.print());
          } else {
            alert('Solicitud creada pero no se recibió URL del PDF. Verifica con Finanzas.');
          }
        });
      },
      error: err => {
        this.procesando = false;
        const code = err?.error?.error?.code;
        const msg = code === 'ERROR_FINANZAS'
          ? 'Error de conexión'
          : err?.error?.error?.message ?? 'Error desconocido';
        alert(msg);
      },
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