import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ReporteBusquedaService } from '../reporte-busqueda/reporte-busqueda';

interface Solicitud {
  id: number;
  folio: string;
  acto_registral_id: number;
  tipo_servicio_id: number;
  estado_id: number;
  buscador_id: number | null;
  fecha_recepcion: string;
  fecha_entrega_resultado: string;
  resultado_busqueda: string | null;
}

interface Catalogo {
  id: number;
  clave: string;
  nombre: string;
}

interface Payment {
  id: string;
  fecha: string;
  monto: string;
  concepto: string;
  referencia: string;
  metodo: string;
  anio: number;
  estadoClave: string;
  estadoNombre: string;
  selected: boolean;
  impreso: boolean;
  urlPdf: string | null;
  folioHojaUsado: number | null;
  rawSolicitud: Solicitud;
}

interface YearRange {
  range: string;
  desde: number | null;
  hasta: number | null;
  count: number;
}

interface ApiResponse<T> {
  ok: boolean;
  data: T;
  meta?: { total: number; limit: number; offset: number };
}

const PRIMER_ANIO        = 1916;
const BLOQUE_INICIAL_FIN = 1949;
const TAMANO_BLOQUE      = 10;
const ULTIMO_ANIO        = new Date().getFullYear();

function buildYearRanges(): Omit<YearRange, 'count'>[] {
  const ranges: Omit<YearRange, 'count'>[] = [
    { range: 'TODOS', desde: null, hasta: null },
    { range: `DEL ${PRIMER_ANIO} AL ${BLOQUE_INICIAL_FIN}`, desde: PRIMER_ANIO, hasta: BLOQUE_INICIAL_FIN },
  ];
  let inicio = BLOQUE_INICIAL_FIN + 1;
  while (inicio <= ULTIMO_ANIO + TAMANO_BLOQUE) {
    const fin = inicio + TAMANO_BLOQUE - 1;
    ranges.push({ range: `DEL ${inicio} AL ${fin}`, desde: inicio, hasta: fin });
    inicio += TAMANO_BLOQUE;
  }
  return ranges;
}

const ESTADOS_POR_FILTRO: Record<string, string[]> = {
  busquedas:    ['EN_BUSQUEDA', 'ASIGNADA', 'PENDIENTE_ASIGNACION'],
  negativos:    ['NO_ENCONTRADA'],
  fotocopias:   ['EN_CERTIFICACION', 'CERTIFICACION_EMITIDA'],
  validaciones: ['EN_VALIDACION', 'VALIDADA'],
  todos:        ['PENDIENTE_ASIGNACION'],
};

const SK_FOLIO_ACTUAL = 'hv_folio_actual';
const SK_FOLIO_USADOS = 'hv_folios_usados';
const SK_BLOQUEADO    = 'hv_bloqueado';

@Component({
  selector: 'app-trabajo',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatCheckboxModule,
    MatTooltipModule,
  ],
  templateUrl: './trabajo.html',
  styleUrls: ['./trabajo.scss']
})
export class TrabajoComponent implements OnInit {

  private readonly API = '/api/v1';

  private get headers() {
    const token = sessionStorage.getItem('token') ?? '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  filters = [
    { label: 'BÚSQUEDAS',    value: 'busquedas'    },
    { label: 'NEGATIVOS',    value: 'negativos'    },
    { label: 'FOTOCOPIAS',   value: 'fotocopias'   },
    { label: 'VALIDACIONES', value: 'validaciones' },
    { label: 'TODOS',        value: 'todos'        },
  ];

  currentFilter          = 'todos';
  fechaPago: Date | null = null;
  folioInput: number | null    = null; 
  folioHojaValorada: number | null = null;  
  folioHojaBloqueado           = false;

  yearRanges: YearRange[]          = buildYearRanges().map(r => ({ ...r, count: 0 }));
  selectedYearRange: string | null = null;
  isLoading  = false;
  payments:  Payment[] = [];
  private allPayments:       Payment[]  = [];
  private catalogoActos:     Catalogo[] = [];
  private catalogoServicios: Catalogo[] = [];
  private catalogoEstados:   Catalogo[] = [];

  private leerUsados(): Set<number> {
    try {
      const raw = sessionStorage.getItem(SK_FOLIO_USADOS);
      return raw ? new Set<number>(JSON.parse(raw)) : new Set<number>();
    } catch { return new Set<number>(); }
  }

  private guardarFolioActual(folio: number): void {
    const anterior = this.folioHojaValorada;
    sessionStorage.setItem(SK_FOLIO_ACTUAL, String(folio));
    sessionStorage.setItem(SK_BLOQUEADO, '1');
    this.folioHojaValorada  = folio;
    this.folioHojaBloqueado = true;
    if (anterior !== null && anterior !== folio) {
      console.log(`[HV] Folio autoIncrementado: ${anterior} → ${folio}`);
    } else {
      console.log(`[HV] Folio establecido: ${folio} | sessionStorage[${SK_FOLIO_ACTUAL}]="${folio}"`);
    }
    console.log(`[HV] Usados en sesión:`, JSON.parse(sessionStorage.getItem(SK_FOLIO_USADOS) ?? '[]'));
  }

  private restaurarDesdeSession(): void {
    if (sessionStorage.getItem(SK_BLOQUEADO) !== '1') return;
    const raw = sessionStorage.getItem(SK_FOLIO_ACTUAL);
    const n   = raw ? parseInt(raw, 10) : NaN;
    if (!isNaN(n) && n > 0) {
      this.folioHojaValorada  = n;
      this.folioHojaBloqueado = true;
      console.log(`[HV] Restaurado desde sessionStorage: folio actual = ${n}`);
    }
  }

  get resultsCount(): string {
    const n = this.payments.length;
    return n === 1 ? '1 resultado' : `${n} resultados`;
  }

  get selectedCount(): number {
    return this.payments.filter(p => p.selected).length;
  }

  constructor(
    private http:    HttpClient,
    private router:  Router,
    private cdr:     ChangeDetectorRef,
    private reporte: ReporteBusquedaService,
  ) {}

  async ngOnInit() {
    this.restaurarDesdeSession();
    await this.cargarCatalogos();
  }

  establecerFolioInicial(): void {
    if (this.folioHojaBloqueado) return;

    const n = Number(this.folioInput);
    if (!n || isNaN(n) || n <= 0 || !Number.isInteger(n)) {
      alert('El folio debe ser un número entero mayor a 0.');
      return;
    }
    if (this.leerUsados().has(n)) {
      alert(`El folio ${n} ya fue usado en esta sesión.`);
      return;
    }

    this.guardarFolioActual(n);
    this.folioInput = null;
    this.cdr.detectChanges();
  }

  goHome() { this.router.navigate(['/home']); }

  setFilter(value: string) {
    this.currentFilter = value;
    this.aplicarFiltros();
  }

  isYearRangeSelected(range: string): boolean {
    return this.selectedYearRange === range;
  }

  selectYearRange(range: string) {
    this.selectedYearRange = this.selectedYearRange === range ? null : range;
    this.fechaPago = null;
    this.aplicarFiltros();
  }

  private async obtenerUrlPdf(payment: Payment): Promise<string | null> {
    try {
      const resp = await this.http
        .get<ApiResponse<{ url_pdf: string; referencia_pago: string }>>(
          `${this.API}/solicitudes/${payment.rawSolicitud.id}/pago`,
          { headers: this.headers }
        ).toPromise();
      return resp?.ok && resp.data?.url_pdf ? resp.data.url_pdf : null;
    } catch (err: any) {
      console.error(`[PDF] Error obteniendo pago de ${payment.id}:`, err?.error?.error ?? err);
      return null;
    }
  }

  async abrirPdf(payment: Payment): Promise<void> {
    const url = await this.obtenerUrlPdf(payment);
    if (url) {
      window.open(url, '_blank');
      payment.impreso = true;
      payment.urlPdf  = url;
      this.cdr.detectChanges();
    } else {
      alert(`No se encontró PDF para el folio ${payment.id}`);
    }
  }

  async buscarPagos() {
    if (!this.folioHojaBloqueado) {
      alert('Es necesario ingresar un folio inicial de hoja valorada antes de buscar registros.');
      return;
    }

    this.isLoading         = true;
    this.allPayments       = [];
    this.payments          = [];
    this.selectedYearRange = null;

    try {
      const estados     = ESTADOS_POR_FILTRO[this.currentFilter] ?? ESTADOS_POR_FILTRO['todos'];
      const promesas    = estados.map(clave => this.cargarPorEstado(clave));
      const resultados  = await Promise.all(promesas);
      const solicitudes = resultados.flat();

      this.allPayments = solicitudes.map(s => this.toPayment(s));
      this.recalcularConteos();
      this.aplicarFiltros();
      setTimeout(() => this.cdr.detectChanges(), 0);
    } catch (err) {
      console.error('Error en buscarPagos:', err);
      alert('Error al buscar registros. Verifica tu conexión.');
    } finally {
      this.isLoading = false;
    }
  }

  private async cargarPorEstado(estadoClave: string): Promise<Solicitud[]> {
    const LIMIT  = 100;
    let offset   = 0;
    let total    = Infinity;
    const acumulado: Solicitud[] = [];

    try {
      while (acumulado.length < total) {
        const url  = `${this.API}/solicitudes?estado=${estadoClave}&limit=${LIMIT}&offset=${offset}`;
        const resp = await this.http
          .get<ApiResponse<Solicitud[]>>(url, { headers: this.headers })
          .toPromise();

        if (!resp?.ok || !resp.data || resp.data.length === 0) break;
        acumulado.push(...resp.data);

        if (resp.meta) {
          total   = resp.meta.total;
          offset += LIMIT;
          if (offset >= total) break;
        } else { break; }
      }
    } catch (err) {
      console.error(`Error cargando estado ${estadoClave}:`, err);
    }

    return acumulado;
  }

  private toPayment(s: Solicitud): Payment {
    const acto     = this.catalogoActos.find(a => a.id === s.acto_registral_id);
    const servicio = this.catalogoServicios.find(sv => sv.id === s.tipo_servicio_id);
    const estado   = this.catalogoEstados.find(e => e.id === s.estado_id);

    return {
      id:             s.folio,
      fecha:          s.fecha_recepcion
                        ? new Date(s.fecha_recepcion).toLocaleDateString('es-MX')
                        : '—',
      monto:          '—',
      concepto:       `${acto?.nombre ?? 'Acto ' + s.acto_registral_id} — ${servicio?.nombre ?? 'Servicio ' + s.tipo_servicio_id}`,
      referencia:     s.folio,
      metodo:         'Línea de Captura',
      anio:           this.extraerAnio(s),
      estadoClave:    estado?.clave  ?? String(s.estado_id),
      estadoNombre:   estado?.nombre ?? String(s.estado_id),
      selected:       false,
      impreso:        false,
      urlPdf:         null,
      folioHojaUsado: null,
      rawSolicitud:   s,
    };
  }

  private extraerAnio(s: Solicitud): number {
    if (s.resultado_busqueda) {
      const match = s.resultado_busqueda.match(/\b(1[89]\d{2}|20\d{2})\b/);
      if (match) return parseInt(match[1], 10);
    }
    return s.fecha_recepcion
      ? new Date(s.fecha_recepcion).getFullYear()
      : new Date().getFullYear();
  }

  private recalcularConteos() {
    this.yearRanges = this.yearRanges.map(yr => ({
      ...yr,
      count: yr.desde === null
        ? this.allPayments.length
        : this.allPayments.filter(p => p.anio >= yr.desde! && p.anio <= yr.hasta!).length,
    }));
  }

  private aplicarFiltros() {
    let resultado = [...this.allPayments];

    if (this.selectedYearRange && this.selectedYearRange !== 'TODOS') {
      const bloque = this.yearRanges.find(yr => yr.range === this.selectedYearRange);
      if (bloque?.desde !== null) {
        resultado = resultado.filter(p => p.anio >= bloque!.desde! && p.anio <= bloque!.hasta!);
      }
    }

    if (this.fechaPago instanceof Date && !isNaN(this.fechaPago.getTime())) {
      const fechaSel = new Date(this.fechaPago);
      fechaSel.setHours(0, 0, 0, 0);
      resultado = resultado.filter(p => {
        if (!p.rawSolicitud.fecha_recepcion) return false;
        const fs = new Date(p.rawSolicitud.fecha_recepcion);
        fs.setHours(0, 0, 0, 0);
        return fs.getTime() === fechaSel.getTime();
      });
    }

    this.payments = resultado;
  }

  async generarReporte(): Promise<void> {
    const folios = this.payments.map(p => p.id);
    if (!folios.length) { alert('No hay registros para generar el reporte'); return; }
    const ok = confirm(`¿Estás seguro? Se generará el reporte con ${folios.length} solicitud(es) y su estado cambiará a ASIGNADA.`);
    if (!ok) return;
    const asignaciones = await this.reporte.generarReporte(folios);
    this.aplicarAsignaciones(asignaciones);
    this.quitarProcesados(new Set(folios));
    this.restaurarDesdeSession();
    this.cdr.detectChanges();
  }

  async generarReporteSeleccionados(): Promise<void> {
    const folios = this.payments.filter(p => p.selected).map(p => p.id);
    if (!folios.length) { alert('Selecciona al menos un registro'); return; }
    const ok = confirm(`¿Estás seguro? Se generará el reporte con ${folios.length} solicitud(es) seleccionada(s) y su estado cambiará a ASIGNADA.`);
    if (!ok) return;
    const asignaciones = await this.reporte.generarReporte(folios);
    this.aplicarAsignaciones(asignaciones);
    this.quitarProcesados(new Set(folios));
    this.restaurarDesdeSession();
    this.cdr.detectChanges();
  }

  private aplicarAsignaciones(asignaciones: Map<string, number> | undefined): void {
    if (!asignaciones?.size) return;
    asignaciones.forEach((folioHV, folioSolicitud) => {
      const p = this.payments.find(p => p.id === folioSolicitud);
      if (p) {
        p.folioHojaUsado = folioHV;
        console.log(`[HV] UI actualizada: ${folioSolicitud} → hoja valorada ${folioHV}`);
      }
    });
  }

  private quitarProcesados(folios: Set<string>): void {
    this.payments    = this.payments.filter(p => !folios.has(p.id));
    this.allPayments = this.allPayments.filter(p => !folios.has(p.id));
    this.recalcularConteos();
  }


  private async cargarCatalogos() {
    try {
      const [actos, servicios, estados] = await Promise.all([
        this.http.get<ApiResponse<Catalogo[]>>(`${this.API}/catalogos/actos-registrales`, { headers: this.headers }).toPromise(),
        this.http.get<ApiResponse<Catalogo[]>>(`${this.API}/catalogos/tipos-servicio`,    { headers: this.headers }).toPromise(),
        this.http.get<ApiResponse<Catalogo[]>>(`${this.API}/catalogos/estados`,           { headers: this.headers }).toPromise(),
      ]);
      this.catalogoActos     = actos?.data     ?? [];
      this.catalogoServicios = servicios?.data ?? [];
      this.catalogoEstados   = estados?.data   ?? [];
    } catch (err) {
      console.error('Error cargando catálogos:', err);
    }
  }
}