import { Component, OnInit, ChangeDetectorRef, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { ReporteBusquedaService } from '../reporte-busqueda/reporte-busqueda';
import { FoliosRecientesService } from '../folios-recientes';
import { fechaLocal } from '../registro-nacimiento.mapper';

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
  entrega: string;
  acto: string;
  servicio: string;
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
  label: string;
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
    { range: 'TODOS', label: 'Todos', desde: null, hasta: null },
    { range: `DEL ${PRIMER_ANIO} AL ${BLOQUE_INICIAL_FIN}`, label: `${PRIMER_ANIO}–${BLOQUE_INICIAL_FIN}`, desde: PRIMER_ANIO, hasta: BLOQUE_INICIAL_FIN },
  ];
  let inicio = BLOQUE_INICIAL_FIN + 1;
  while (inicio <= ULTIMO_ANIO) {
    const fin = inicio + TAMANO_BLOQUE - 1;
    ranges.push({ range: `DEL ${inicio} AL ${fin}`, label: `${inicio}–${fin}`, desde: inicio, hasta: fin });
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
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatAutocompleteModule,
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

  readonly filters = [
    { label: 'Búsquedas',    value: 'busquedas',    icon: 'travel_explore' },
    { label: 'Negativos',    value: 'negativos',    icon: 'block' },
    { label: 'Fotocopias',   value: 'fotocopias',   icon: 'content_copy' },
    { label: 'Validaciones', value: 'validaciones', icon: 'verified' },
    { label: 'Todos',        value: 'todos',        icon: 'apps' },
  ];

  currentFilter                    = 'todos';
  fechaPago                        = '';
  folioBusqueda                    = '';
  folioInput: number | null        = null;
  folioHojaValorada: number | null = null;

  yearRanges: YearRange[]          = buildYearRanges().map(r => ({ ...r, count: 0 }));
  selectedYearRange: string | null = null;
  isLoading      = false;
  busquedaHecha  = false;
  mensajeError   = '';
  payments:  Payment[] = [];
  private allPayments:       Payment[]  = [];
  private catalogoActos:     Catalogo[] = [];
  private catalogoServicios: Catalogo[] = [];
  private catalogoEstados:   Catalogo[] = [];

  readonly textoFolio = signal('');
  readonly sugerenciasFolio = computed(() => {
    const t = this.textoFolio().trim().toUpperCase();
    return this.folios.lista().filter(f => !t || f.folio.toUpperCase().includes(t)).slice(0, 8);
  });

  private leerUsados(): Set<number> {
    try {
      const raw = sessionStorage.getItem(SK_FOLIO_USADOS);
      return raw ? new Set<number>(JSON.parse(raw)) : new Set<number>();
    } catch { return new Set<number>(); }
  }

  private leerFolioActual(): number | null {
    const raw = sessionStorage.getItem(SK_FOLIO_ACTUAL);
    const n   = raw ? parseInt(raw, 10) : NaN;
    return !isNaN(n) && n > 0 ? n : null;
  }

  private siguienteLibre(desde: number): number {
    const usados = this.leerUsados();
    while (usados.has(desde)) { desde++; }
    return desde;
  }

  private guardarFolioActual(folio: number): void {
    sessionStorage.setItem(SK_FOLIO_ACTUAL, String(folio));
    sessionStorage.setItem(SK_BLOQUEADO, '1');
    this.folioHojaValorada = folio;
  }

  private restaurarDesdeSession(): void {
    if (sessionStorage.getItem(SK_BLOQUEADO) !== '1') return;
    const n = this.leerFolioActual();
    if (n) this.folioHojaValorada = n;
  }

  get totalCargados(): number {
    return this.allPayments.length;
  }

  get selectedCount(): number {
    return this.payments.filter(p => p.selected).length;
  }

  get todosSeleccionados(): boolean {
    return this.payments.length > 0 && this.payments.every(p => p.selected);
  }

  get siguienteFolioEsperado(): number | null {
    const actual = this.leerFolioActual();
    if (!actual) return null;
    return this.siguienteLibre(actual);
  }

  get filtroActual() {
    return this.filters.find(f => f.value === this.currentFilter);
  }

  constructor(
    private http:    HttpClient,
    private router:  Router,
    private cdr:     ChangeDetectorRef,
    private reporte: ReporteBusquedaService,
    public  folios:  FoliosRecientesService,
  ) {}

  async ngOnInit() {
    this.restaurarDesdeSession();
    await this.cargarCatalogos();
  }

  establecerFolioInicial(): void {
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

  onFolioInput(valor: string): void {
    this.folioBusqueda = valor;
    this.textoFolio.set(valor);
  }

  elegirFolio(folio: string): void {
    this.folioBusqueda = folio;
    this.textoFolio.set(folio);
    this.buscarPagos();
  }

  limpiarBusqueda(): void {
    this.folioBusqueda = '';
    this.textoFolio.set('');
    this.fechaPago = '';
    this.selectedYearRange = null;
    this.allPayments = [];
    this.payments = [];
    this.busquedaHecha = false;
    this.mensajeError = '';
    this.recalcularConteos();
  }

  onFechaChange(): void {
    this.aplicarFiltros();
  }

  isYearRangeSelected(range: string): boolean {
    return this.selectedYearRange === range;
  }

  selectYearRange(range: string) {
    this.selectedYearRange = this.selectedYearRange === range ? null : range;
    this.fechaPago = '';
    this.aplicarFiltros();
  }

  toggleTodos(marcar: boolean): void {
    this.payments.forEach(p => p.selected = marcar);
  }

  private async obtenerUrlPdf(payment: Payment): Promise<string | null> {
    try {
      const resp = await firstValueFrom(this.http
        .get<ApiResponse<{ url_pdf: string; referencia_pago: string }>>(
          `${this.API}/solicitudes/${payment.rawSolicitud.id}/pago`,
          { headers: this.headers }
        ));
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
    if (this.currentFilter === 'fotocopias' && !this.leerFolioActual()) {
      alert('Es necesario ingresar un folio inicial de hoja valorada antes de buscar en Fotocopias.');
      return;
    }

    this.isLoading         = true;
    this.busquedaHecha     = true;
    this.mensajeError      = '';
    this.allPayments       = [];
    this.payments          = [];
    this.selectedYearRange = null;
    this.cdr.detectChanges();

    try {
      const folio = this.folioBusqueda.trim().toUpperCase();
      let solicitudes: Solicitud[];

      if (folio) {
        solicitudes = await this.cargarPorFolio(folio);
      } else {
        const estados    = ESTADOS_POR_FILTRO[this.currentFilter] ?? ESTADOS_POR_FILTRO['todos'];
        const resultados = await Promise.all(estados.map(clave => this.cargarPorEstado(clave)));
        solicitudes = resultados.flat();
      }

      this.allPayments = solicitudes.map(s => this.toPayment(s));
      this.recalcularConteos();
      this.aplicarFiltros();
    } catch (err) {
      console.error('Error en buscarPagos:', err);
      this.mensajeError = 'Error al buscar registros. Verifica tu conexión.';
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  private async cargarPorFolio(folio: string): Promise<Solicitud[]> {
    try {
      const resp = await firstValueFrom(this.http.get<ApiResponse<Solicitud>>(
        `${this.API}/solicitudes/folio/${encodeURIComponent(folio)}`, { headers: this.headers }));
      return resp?.ok && resp.data ? [resp.data] : [];
    } catch (err: any) {
      if (err?.status === 404) return [];
      throw err;
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
        const resp = await firstValueFrom(this.http.get<ApiResponse<Solicitud[]>>(url, { headers: this.headers }));

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

  private fechaCorta(iso: string | null | undefined, soloDia = false): string {
    if (!iso) return '—';
    const d = soloDia ? fechaLocal(iso) : new Date(iso);
    return !d || isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  private toPayment(s: Solicitud): Payment {
    const acto     = this.catalogoActos.find(a => a.id === s.acto_registral_id);
    const servicio = this.catalogoServicios.find(sv => sv.id === s.tipo_servicio_id);
    const estado   = this.catalogoEstados.find(e => e.id === s.estado_id);

    return {
      id:             s.folio,
      fecha:          this.fechaCorta(s.fecha_recepcion),
      entrega:        this.fechaCorta(s.fecha_entrega_resultado, true),
      acto:           acto?.nombre ?? `Acto ${s.acto_registral_id}`,
      servicio:       servicio?.nombre ?? `Servicio ${s.tipo_servicio_id}`,
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

  private fechaLocalISO(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`;
  }

  private aplicarFiltros() {
    let resultado = [...this.allPayments];

    if (this.selectedYearRange && this.selectedYearRange !== 'TODOS') {
      const bloque = this.yearRanges.find(yr => yr.range === this.selectedYearRange);
      if (bloque && bloque.desde !== null) {
        resultado = resultado.filter(p => p.anio >= bloque.desde! && p.anio <= bloque.hasta!);
      }
    }

    if (this.fechaPago) {
      resultado = resultado.filter(p =>
        !!p.rawSolicitud.fecha_recepcion && this.fechaLocalISO(p.rawSolicitud.fecha_recepcion) === this.fechaPago);
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
      if (p) p.folioHojaUsado = folioHV;
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
        firstValueFrom(this.http.get<ApiResponse<Catalogo[]>>(`${this.API}/catalogos/actos-registrales`, { headers: this.headers })),
        firstValueFrom(this.http.get<ApiResponse<Catalogo[]>>(`${this.API}/catalogos/tipos-servicio`,    { headers: this.headers })),
        firstValueFrom(this.http.get<ApiResponse<Catalogo[]>>(`${this.API}/catalogos/estados`,           { headers: this.headers })),
      ]);
      this.catalogoActos     = actos?.data     ?? [];
      this.catalogoServicios = servicios?.data ?? [];
      this.catalogoEstados   = estados?.data   ?? [];
    } catch (err) {
      console.error('Error cargando catálogos:', err);
    }
  }
}