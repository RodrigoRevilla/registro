import { Component, OnInit, NgZone, ChangeDetectorRef, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService, RegistroNacimiento } from '../http';
import { AuthService } from '../auth';
import { fechaLocal, nombreCompleto } from '../registro-nacimiento.mapper';
import { FoliosRecientesService } from '../folios-recientes';

@Component({
  selector: 'app-certificacion',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './certificacion.html',
  styleUrls: ['./certificacion.scss'],
})
export class CertificacionComponent implements OnInit {

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
  actosRegistrales: any[] = [];
  tiposServicio: any[] = [];
  desdeRegistro = false;

  entidadCodigo = ''; entidadNombre = '';
  distritoCodigo = ''; distritoNombre = '';
  municipioCodigo = ''; municipioNombre = '';
  localidadCodigo = ''; localidadNombre = '';
  foja = ''; oficialia = ''; acta = ''; enDoc = '';
  fechaActa = '';
  anioActa = '';
  nombreRegistrado = ''; crip = '';
  entidadNacCodigo = ''; entidadNacNombre = '';
  municipioNacCodigo = ''; municipioNacNombre = '';
  distritoNacCodigo = ''; distritoNacNombre = '';
  localidadNacCodigo = ''; localidadNacNombre = '';
  padre = ''; madre = '';
  tipoServicioId = 1;
  documentoPresentado = '';
  copiasSOlicitadas = 1;
  aniosBusqueda = ''; rangoBusqueda = '';
  today = this.fechaHoy();
  fechaEntrega = '';
  readonly avisoFechaEntrega = signal('');
  horaEntrega = '';
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
  ) { }

  ngOnInit(): void {
    document.documentElement.style.setProperty('--disable-anim', '1');

    setTimeout(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }, 50);

    if (!this.authService.getToken()) {
      this.router.navigate(['/login']);
      return;
    }
    this.cargarCatalogos();
    this.precargarRegistro();
  }

  private fechaHoy(): string {
    const d = new Date();
    return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`;
  }

  private aISO(d: Date | null): string {
    if (!d) return '';
    return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`;
  }

  private precargarRegistro(): void {
    const r: RegistroNacimiento | undefined = history.state?.registroNacimiento;
    if (!r) return;
    const cod = (v: number | null) => (v != null ? `${v}` : '');
    this.desdeRegistro = true;
    this.entidadCodigo = cod(r.estado_registro_historico_id);
    this.entidadNombre = r.estado_registro_historico_texto ?? '';
    this.distritoCodigo = cod(r.distrito_registro_historico_id);
    this.distritoNombre = r.distrito_registro_historico_texto ?? '';
    this.municipioCodigo = cod(r.municipio_registro_historico_id);
    this.municipioNombre = r.municipio_registro_historico_texto ?? '';
    this.localidadCodigo = cod(r.localidad_registro_historica_id);
    this.localidadNombre = r.localidad_registro_historica_texto ?? '';
    this.foja = r.foja != null ? `${r.foja}` : '';
    this.oficialia = cod(r.oficialia);
    this.acta = r.numero_acta != null ? `${r.numero_acta}` : (r.numero_acta_original ?? '');
    const fReg = fechaLocal(r.fecha_registro)
      ?? (r.anio_registro && r.mes_registro && r.dia_registro
        ? new Date(r.anio_registro, r.mes_registro - 1, r.dia_registro)
        : null);
    this.fechaActa = this.aISO(fReg);
    this.anioActa = cod(r.anio_registro);
    this.nombreRegistrado = nombreCompleto(r.nombre, r.apellido_paterno, r.apellido_materno);
    this.crip = r.crip_ed ?? r.curp ?? '';
    this.entidadNacCodigo = cod(r.estado_nacimiento_historico_id);
    this.entidadNacNombre = r.estado_nacimiento_historico_texto ?? '';
    this.municipioNacCodigo = cod(r.municipio_nacimiento_historico_id);
    this.municipioNacNombre = r.municipio_nacimiento_historico_texto ?? '';
    this.distritoNacCodigo = cod(r.distrito_nacimiento_historico_id);
    this.distritoNacNombre = r.distrito_nacimiento_historico_texto ?? '';
    this.localidadNacCodigo = cod(r.localidad_nacimiento_historica_id);
    this.localidadNacNombre = r.localidad_nacimiento_historica_texto ?? '';
    this.padre = nombreCompleto(r.nombre_padre, r.apellido_paterno_padre, r.apellido_materno_padre);
    this.madre = nombreCompleto(r.nombre_madre, r.apellido_paterno_madre, r.apellido_materno_madre);
    this.nombreContribuyente = this.nombreRegistrado;
  }

  private cargarCatalogos(): void {
    this.apiService.getActosRegistrales().subscribe({
      next: resp => { if (resp.ok) { this.actosRegistrales = resp.data; this.cdr.detectChanges(); } },
      error: err => console.error('Error actos registrales:', err.status),
    });
    this.apiService.getTiposServicio().subscribe({
      next: resp => { if (resp.ok) { this.tiposServicio = resp.data; this.cdr.detectChanges(); } },
      error: err => console.error('Error tipos de servicio:', err.status),
    });
  }

  iniciales(nombre: string): string {
    const partes = (nombre ?? '').trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return '—';
    const primera = partes[0][0] ?? '';
    const segunda = partes.length > 2 ? partes[partes.length - 2][0] : (partes[1]?.[0] ?? '');
    return `${primera}${segunda}`.toUpperCase();
  }

  crearNuevaSolicitud(): void {
    if (!this.nombreContribuyente.trim()) { alert('Falta el nombre del contribuyente.'); return; }
    if (!this.fechaEntrega) { alert('Falta la Fecha de Entrega.'); return; }

    const fechaStr = this.fechaEntrega;
    if (fechaStr < this.today) {
      alert('La Fecha de Entrega no puede ser anterior a hoy.'); return;
    }
    if (this.esFinDeSemana(fechaStr)) {
      alert('La Fecha de Entrega debe ser de lunes a viernes.'); return;
    }

    this.procesando = true;
    this.mostrarPdf = false;
    this.urlPdf = null;
    this.folioGenerado = null;
    this.lineaCaptura = null;

    const payload = {
      acto_registral_id: 1,
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
              this.urlPdf = url;
              this.mostrarPdf = true;
              this.cdr.detectChanges();
              const ventana = window.open(url, '_blank', `width=${screen.width},height=${screen.height},top=0,left=0`);
              ventana?.addEventListener('load', () => ventana.print());
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
          alert(code === 'ERROR_FINANZAS'
            ? 'Error de conexión con Finanzas'
            : err?.error?.error?.message ?? 'Error desconocido');
        });
      },
    });
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

  autoHoraEntrega(): void {
    if (!this.horaEntrega) return;
    const [horas, minutos] = this.horaEntrega.split(':').map(Number);
    if (horas < 12) {
      const pm = horas + 12;
      this.horaEntrega = `${pm.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
    }
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

  goHome(): void {
    this.router.navigate(['/home']);
  }
}