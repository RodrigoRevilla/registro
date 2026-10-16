import { Component, OnInit, NgZone, ChangeDetectorRef, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../http';
import { AuthService } from '../auth';
import { FoliosRecientesService } from '../folios-recientes';
import { AvisosService } from '../avisos';

@Component({
  selector: 'app-defuncion-solicitud',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatTooltipModule, MatProgressSpinnerModule],
  templateUrl: './defuncion-solicitud.html',
  styleUrls: ['../certificacion/certificacion.scss'],
})
export class DefuncionSolicitudComponent implements OnInit {
  private readonly avisos = inject(AvisosService);

  readonly usosCfdi = [
    { clave: 'S01', nombre: 'Sin efectos fiscales' },
    { clave: 'G01', nombre: 'Adquisición de mercancías' },
    { clave: 'G03', nombre: 'Gastos en general' },
    { clave: 'D03', nombre: 'Gastos funerales' },
    { clave: 'D04', nombre: 'Donativos' },
  ];

  readonly regimenes = [
    { clave: '616', nombre: 'Sin obligaciones fiscales' },
    { clave: '601', nombre: 'General de ley personas morales' },
    { clave: '603', nombre: 'Personas morales con fines no lucrativos' },
    { clave: '605', nombre: 'Sueldos y salarios' },
    { clave: '606', nombre: 'Arrendamiento' },
    { clave: '607', nombre: 'Enajenación o adquisición de bienes' },
    { clave: '608', nombre: 'Demás ingresos' },
    { clave: '612', nombre: 'Personas físicas con actividades empresariales' },
    { clave: '621', nombre: 'Incorporación fiscal' },
    { clave: '626', nombre: 'Régimen simplificado de confianza' },
  ];

  readonly tiposServicioRespaldo = [
    { id: 1, nombre: 'C: Certificación de acta' },
    { id: 2, nombre: 'E: Const. Reg. Extem.' },
    { id: 3, nombre: 'F: Fotocopia certificada' },
    { id: 4, nombre: 'G: Anotación y Fotocopia' },
    { id: 5, nombre: 'H: Anotación marginal' },
    { id: 6, nombre: 'I: Fotocopia índice' },
    { id: 7, nombre: 'J: Fotocopia C./Anot. ya pagada' },
    { id: 8, nombre: 'M: Anotación marginal' },
    { id: 9, nombre: 'O: Anotación marginal con certificación' },
    { id: 10, nombre: 'P: Fot. Ant y Post' },
    { id: 11, nombre: 'R: Fot. Ant, Int, Post' },
    { id: 12, nombre: 'V: Fotocopia C/Índice alfabético' },
    { id: 13, nombre: 'W: Fotocopia índice e inter.' },
    { id: 14, nombre: 'X: Validación' },
    { id: 15, nombre: 'Z: Fotocopia con anotación pagada' },
    { id: 16, nombre: 'L: Certificación con anotación pagada' },
  ];

  mostrarPdf = false;
  procesando = false;
  urlPdf: string | null = null;
  folioGenerado: string | null = null;
  lineaCaptura: string | null = null;
  tiposServicio: any[] = [];
  desdeRegistro = false;

  entidad = '';
  distrito = '';
  municipio = '';
  localidad = '';
  oficialia = '';
  acta = '';
  anio = '';
  fechaRegistro = '';
  enDoc = '';
  llave = '';
  tipoDefuncion = '';
  status = '';

  nombre = ''; apellidoPaterno = ''; apellidoMaterno = '';
  fechaDefuncion = '';
  lugarDefuncion = '';

  tipoServicioId = 1;
  documentoPresentado = '';
  copiasSolicitadas = 1;
  aniosBusqueda = ''; rangoBusqueda = '';
  today = this.fechaHoy();
  fechaEntrega = '';
  readonly avisoFechaEntrega = signal('');
  readonly horaEntrega = '11:00';
  nombreContribuyente = '';
  usoCfdi = 'S01';
  rfc = 'XAXX010101000';
  regimenFiscal = '616';
  email = '';
  codigoPostal = '68050';
  tipoCondonado = 'no';
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
    private cdr: ChangeDetectorRef,
    public folios: FoliosRecientesService,
  ) {}

  ngOnInit(): void {
    setTimeout(() => window.scrollTo(0, 0), 50);
    if (!this.authService.getToken()) {
      this.router.navigate(['/login']);
      return;
    }
    const state = history.state ?? {};
    if (!state || (!state['manual'] && !state['nombre'] && !state['acta'])) {
      this.router.navigate(['/defunciones']);
      return;
    }
    this.precargar(state);
    this.cargarCatalogos();
  }

  private precargar(s: Record<string, any>): void {
    const v = (k: string) => `${s[k] ?? ''}`;
    this.desdeRegistro = !s['manual'];
    this.tiposServicio = Array.isArray(s['tiposServicio']) ? s['tiposServicio'] : [];
    this.entidad = v('entidad');
    this.distrito = v('distrito');
    this.municipio = v('municipio');
    this.localidad = v('localidad');
    this.oficialia = v('oficialia');
    this.acta = v('acta');
    this.anio = v('anio');
    this.fechaRegistro = this.aISODesdeCorta(v('fechaRegistro'));
    this.enDoc = v('enDoc');
    this.llave = v('llave');
    this.tipoDefuncion = v('tipoDefuncion');
    this.status = v('status');
    this.nombre = v('nombre');
    this.apellidoPaterno = v('apellidoPaterno');
    this.apellidoMaterno = v('apellidoMaterno');
    this.fechaDefuncion = this.aISODesdeCorta(v('fechaDefuncion'));
    this.lugarDefuncion = v('lugarDefuncion');
  }

  private cargarCatalogos(): void {
    if (this.tiposServicio.length) return;
    this.apiService.getTiposServicio().subscribe({
      next: resp => { if (resp?.ok) { this.tiposServicio = resp.data ?? []; this.cdr.detectChanges(); } },
      error: err => console.error('Error tipos de servicio:', err?.status),
    });
  }

  get finado(): string {
    return [this.nombre, this.apellidoPaterno, this.apellidoMaterno].map(x => x.trim()).filter(Boolean).join(' ');
  }

  get iniciales(): string {
    const a = this.nombre.trim()[0] ?? '';
    const b = this.apellidoPaterno.trim()[0] ?? '';
    return `${a}${b}`.toUpperCase() || '—';
  }

  private fechaHoy(): string {
    return this.aISO(new Date());
  }

  private aISO(d: Date | null): string {
    if (!d) return '';
    return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`;
  }

  private aISODesdeCorta(txt: string): string {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(txt.trim());
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    return /^\d{4}-\d{2}-\d{2}/.test(txt) ? txt.slice(0, 10) : '';
  }

  private desdeISO(iso: string): Date | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
  }

  esFinDeSemana(iso: string): boolean {
    const d = this.desdeISO(iso);
    if (!d) return false;
    const dia = d.getDay();
    return dia === 0 || dia === 6;
  }

  private siguienteHabil(iso: string): string {
    const d = this.desdeISO(iso);
    if (!d) return iso;
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    return this.aISO(d);
  }

  autoFechaEntrega(input: HTMLInputElement): void {
    if (!this.fechaEntrega) {
      this.fechaEntrega = this.siguienteHabil(this.today);
      input.value = this.fechaEntrega;
      this.avisoFechaEntrega.set('');
    }
  }

  ajustarFechaEntrega(input: HTMLInputElement): void {
    const valor = input.value;
    this.fechaEntrega = valor;
    this.avisoFechaEntrega.set('');
    if (!valor || !this.esFinDeSemana(valor)) return;
    const nombreDia = this.desdeISO(valor)!.getDay() === 6 ? 'sábado' : 'domingo';
    const habil = this.siguienteHabil(valor);
    this.fechaEntrega = habil;
    input.value = habil;
    const lunes = this.desdeISO(habil)!;
    this.avisoFechaEntrega.set(
      `Era ${nombreDia}; se pasó al lunes ${lunes.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' })}.`
    );
  }

  crearNuevaSolicitud(): void {
    if (!this.nombreContribuyente.trim()) { this.avisos.error('Falta el nombre del contribuyente.'); return; }
    if (!this.fechaEntrega) { this.avisos.error('Falta la Fecha de Entrega.'); return; }

    const fechaStr = this.fechaEntrega;
    if (fechaStr < this.today) {
      this.avisos.error('La Fecha de Entrega no puede ser anterior a hoy.'); return;
    }
    if (this.esFinDeSemana(fechaStr)) {
      this.avisos.error('La Fecha de Entrega debe ser de lunes a viernes.'); return;
    }

    this.procesando = true;
    this.mostrarPdf = false;
    this.urlPdf = null;
    this.folioGenerado = null;
    this.lineaCaptura = null;

    const payload = {
      acto_registral_id: 4,
      tipo_servicio_id: Number(this.tipoServicioId),
      ventanilla_id: 1,
      fecha_entrega_resultado: `${fechaStr}T00:00:00Z`,
      nombre_contribuyente: this.nombreContribuyente.trim(),
      rfc: this.rfc.trim().toUpperCase() || 'XAXX010101000',
      email: this.email.trim(),
      codigo_postal: this.codigoPostal.trim(),
      uso_cfdi: this.usoCfdi || 'S01',
      regimen_fiscal: this.regimenFiscal || '616',
    };

    this.apiService.crearSolicitud(payload).subscribe({
      next: response => {
        const url = response?.data?.linea_pago?.url_pdf;

        this.ngZone.run(() => {
          this.procesando = false;
          this.folioGenerado = response?.data?.solicitud?.folio ?? null;
          this.lineaCaptura = response?.data?.pago?.referencia_pago ?? null;
          if (this.folioGenerado) {
            this.folios.agregar({
              folio: this.folioGenerado,
              lineaCaptura: this.lineaCaptura ?? '',
              nombre: this.nombreContribuyente.trim(),
              urlPdf: url ?? '',
            });
          }

          setTimeout(() => {
            if (url) {
              const ventana = window.open(url, '_blank', `width=${screen.width},height=${screen.height},top=0,left=0`);
              ventana?.addEventListener('load', () => ventana.print());
            } else {
              this.avisos.aviso('Solicitud creada pero no se recibió URL del PDF. Verifica con Finanzas.');
            }
            this.router.navigate(['/defunciones'], {
              state: {
                hojaGenerada: {
                  folio: this.folioGenerado ?? '',
                  lineaCaptura: this.lineaCaptura ?? '',
                  nombre: this.nombreContribuyente.trim(),
                  urlPdf: url ?? '',
                },
              },
            });
          }, 0);
        });
      },

      error: err => {
        this.ngZone.run(() => {
          this.procesando = false;
          this.cdr.detectChanges();
          const code = err?.error?.error?.code;
          this.avisos.error(code === 'ERROR_FINANZAS'
            ? 'Error de conexión con Finanzas'
            : err?.error?.error?.message ?? 'Error desconocido');
        });
      },
    });
  }

  copiarFolio(): void {
    if (this.folioGenerado) this.folios.copiar(this.folioGenerado);
  }

  copiarLineaCaptura(): void {
    if (this.lineaCaptura) this.folios.copiar(this.lineaCaptura);
  }

  imprimir(): void {
    if (this.urlPdf) {
      const ventana = window.open(this.urlPdf, '_blank', 'width=900,height=700');
      ventana?.addEventListener('load', () => ventana.print());
    }
  }

  regresar(): void {
    this.router.navigate(['/defunciones']);
  }
}