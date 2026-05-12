import { Component, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../http';

@Component({
  selector: 'app-matrimonio-solicitud',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTooltipModule,
  ],
  templateUrl: './matrimonio-solicitud.html',
  styleUrls:   ['./matrimonio-solicitud.scss'],
})
export class MatrimonioSolicitudComponent implements OnInit {
  entidad          = '';
  municipio        = '';
  oficialia        = '';
  distrito         = '';
  localidad        = '';
  curpMat          = '';
  anio             = '';
  acta             = '';
  enDoc            = '';
  fechaRegistro    = '';
  nombre1          = '';
  apellidoPaterno1 = '';
  apellidoMaterno1 = '';
  crip1            = '';
  fechaNacimiento1 = '';
  nombre2          = '';
  apellidoPaterno2 = '';
  apellidoMaterno2 = '';
  crip2            = '';
  fechaNacimiento2 = '';
  status           = '';
  tiposServicio:      any[]            = [];
  tipoServicioId      = 0;
  documentoPresentado = '';
  copiasSolicitadas   = 1;
  modalidad           = 'automatizado';
  aniosBusqueda       = '';
  rangoBusqueda       = '';
  fechaEntrega: Date | string = '';
  horaEntrega         = '11:00';
  observaciones = '';
  tipoCondonado   = 'no';
  numeroOficio    = '';
  fechaOficio: Date | string = '';
  reciboNumero    = '';
  fechaPagoRecibo: Date | string = '';
  nombreContribuyente = '';
  rfc                 = 'XAXX010101000';
  usoCfdi             = 'S01';
  regimenFiscal       = '616';
  email               = '';
  codigoPostal        = '68000';
  procesando     = false;
  folioGenerado: string | null = null;
  lineaCaptura:  string | null = null;
  urlPdf:        string | null = null;
  today: string  = (() => {
    const h = new Date();
    return `${h.getFullYear()}-${String(h.getMonth()+1).padStart(2,'0')}-${String(h.getDate()).padStart(2,'0')}`;
  })();

  constructor(
    private router:     Router,
    private route:      ActivatedRoute,
    private apiService: ApiService,
    private ngZone:     NgZone,
    private cdr:        ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const nav   = this.router.getCurrentNavigation();
    const state = nav?.extras?.state ?? history.state;

    if (!state || Object.keys(state).length === 0) {
      this.router.navigate(['/matrimonios']);
      return;
    }

    this.entidad          = state['entidad']          ?? '';
    this.municipio        = state['municipio']        ?? '';
    this.oficialia        = state['oficialia']        ?? '';
    this.distrito         = state['distrito']         ?? '';
    this.localidad        = state['localidad']        ?? '';
    this.curpMat          = state['curpMat']          ?? '';
    this.anio             = state['anio']             ?? '';
    this.acta             = state['acta']             ?? '';
    this.enDoc            = state['enDoc']            ?? '';
    this.fechaRegistro    = state['fechaRegistro']    ?? '';
    this.nombre1          = state['nombre1']          ?? '';
    this.apellidoPaterno1 = state['apellidoPaterno1'] ?? '';
    this.apellidoMaterno1 = state['apellidoMaterno1'] ?? '';
    this.crip1            = state['crip1']            ?? '';
    this.fechaNacimiento1 = state['fechaNacimiento1'] ?? '';
    this.nombre2          = state['nombre2']          ?? '';
    this.apellidoPaterno2 = state['apellidoPaterno2'] ?? '';
    this.apellidoMaterno2 = state['apellidoMaterno2'] ?? '';
    this.crip2            = state['crip2']            ?? '';
    this.fechaNacimiento2 = state['fechaNacimiento2'] ?? '';
    this.status           = state['status']           ?? '';
    this.tiposServicio    = state['tiposServicio']    ?? [];

    this.nombreContribuyente =
      `${this.nombre1} ${this.apellidoPaterno1} ${this.apellidoMaterno1}`.trim();
  }

  private toDateStr(val: Date | string | null): string {
    if (!val) return '';
    if (val instanceof Date) {
      const y = val.getFullYear();
      const m = String(val.getMonth() + 1).padStart(2, '0');
      const d = String(val.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return val;
  }

  autoFechaEntrega(): void {
    if (!this.fechaEntrega) {
      const [a, m, d] = this.today.split('-').map(Number);
      this.fechaEntrega = new Date(a, m - 1, d);
    }
  }

  autoHoraEntrega(): void {
    if (!this.horaEntrega) return;
    const [h, min] = this.horaEntrega.split(':').map(Number);
    if (h < 12) {
      this.horaEntrega =
        `${String(h + 12).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    }
  }

  copiar(texto: string): void {
    navigator.clipboard.writeText(texto);
  }

  imprimir(): void {
    if (this.urlPdf) {
      const v = window.open(
        this.urlPdf, '_blank',
        `width=${screen.width},height=${screen.height},top=0,left=0`
      );
      v?.addEventListener('load', () => v.print());
    }
  }

  generar(): void {
    if (!this.tipoServicioId || this.tipoServicioId === 0) {
      alert('Selecciona un tipo de servicio.'); return;
    }
    if (!this.fechaEntrega) {
      alert('Falta la Fecha de Entrega.'); return;
    }

    const fechaStr = this.toDateStr(this.fechaEntrega);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
      alert('Formato de fecha de entrega inválido.'); return;
    }

    const [anio, mes, dia] = fechaStr.split('-').map(Number);
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    if (new Date(anio, mes - 1, dia) < hoy) {
      alert('La Fecha de Entrega no puede ser anterior a hoy.'); return;
    }

    this.procesando = true;

    const tipoServicioNombre = this.tiposServicio
      .find(ts => ts.id === Number(this.tipoServicioId))?.nombre ?? '';

    const resultadoBusqueda = {
      entidad:             this.entidad,
      municipio:           this.municipio,
      oficialia:           this.oficialia,
      distrito:            this.distrito,
      localidad:           this.localidad,
      curpMat:             this.curpMat,
      anio:                this.anio,
      acta:                this.acta,
      enDoc:               this.enDoc,
      fechaRegistro:       this.fechaRegistro,
      nombre:              `${this.nombre1} ${this.apellidoPaterno1} ${this.apellidoMaterno1}`.trim(),
      nombreContrayente2:  `${this.nombre2} ${this.apellidoPaterno2} ${this.apellidoMaterno2}`.trim(),
      crip:                this.crip1,
      crip2:               this.crip2,
      fechaNacimiento:     this.fechaNacimiento1,
      fechaNacimiento2:    this.fechaNacimiento2,
      status:              this.status,
      tipoActa:            'MATRIMONIO',
      servicio:            tipoServicioNombre,
      copiasSolicitadas:   String(this.copiasSolicitadas),
      documentoPresentado: this.documentoPresentado,
      modalidad:           this.modalidad,
      aniosBusqueda:       this.aniosBusqueda,
      rangoBusqueda:       this.rangoBusqueda,
      horaEntrega:         this.horaEntrega,
      observaciones:       this.observaciones,
    };

    const payload = {
      acto_registral_id:       2,
      tipo_servicio_id:        Number(this.tipoServicioId),
      ventanilla_id:           1,
      fecha_entrega_resultado: `${fechaStr}T00:00:00Z`,
      nombre_contribuyente:    this.nombreContribuyente || '',
      rfc:                     this.rfc           || '',
      email:                   this.email         || '',
      codigo_postal:           this.codigoPostal  || '',
      uso_cfdi:                this.usoCfdi       || 'S01',
      regimen_fiscal:          this.regimenFiscal || '616',
      //resultado_busqueda:      JSON.stringify(resultadoBusqueda),
    };

    this.apiService.crearSolicitud(payload).subscribe({
      next: response => {
        this.ngZone.run(() => {
          this.procesando    = false;
          this.folioGenerado = response?.data?.solicitud?.folio   ?? null;
          this.lineaCaptura  = response?.data?.pago?.referencia_pago ?? null;
          const url          = response?.data?.linea_pago?.url_pdf   ?? null;

          setTimeout(() => {
            if (url) {
              this.urlPdf = url;
              this.cdr.detectChanges();
              const v = window.open(
                url, '_blank',
                `width=${screen.width},height=${screen.height},top=0,left=0`
              );
              v?.addEventListener('load', () => v.print());
            } else {
              alert('Solicitud creada pero no se recibió URL del PDF. Verifica con Finanzas.');
            }
            this.cdr.detectChanges();
          }, 0);
        });
      },
      error: err => {
        this.ngZone.run(() => {
          this.procesando = false;
          this.cdr.detectChanges();
          const code = err?.error?.error?.code;
          console.error('[matrimonio] error payload:', payload);
          console.error('[matrimonio] error response:', err?.error);
          alert(
            code === 'ERROR_FINANZAS'
              ? 'Error de conexión con Finanzas'
              : err?.error?.error?.message ?? 'Error desconocido'
          );
        });
      },
    });
  }

  regresar(): void {
    this.router.navigate(['/matrimonios']);
  }
}