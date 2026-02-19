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



const PRIMER_ANIO = 1916;
const BLOQUE_INICIAL_FIN = 1949;
const TAMANO_BLOQUE = 10;
const ULTIMO_ANIO = new Date().getFullYear();

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
  busquedas: ['EN_BUSQUEDA', 'ASIGNADA', 'PENDIENTE_ASIGNACION'],
  negativos: ['NO_ENCONTRADA'],
  fotocopias: ['EN_CERTIFICACION', 'CERTIFICACION_EMITIDA'],
  validaciones: ['EN_VALIDACION', 'VALIDADA'],
  todos: [
    'RECIBIDA', 'PENDIENTE_PAGO', 'PAGADA', 'PENDIENTE_ASIGNACION',
    'ASIGNADA', 'EN_BUSQUEDA', 'EN_CERTIFICACION', 'EN_VALIDACION',
    'VALIDADA', 'LISTA_ENTREGA', 'ENTREGADA', 'NO_ENCONTRADA',
    'RECHAZADA', 'CANCELADA',
  ],
};


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
  ],
  templateUrl: './trabajo.html',
  styleUrls: ['./trabajo.scss']
})
export class TrabajoComponent implements OnInit {

  private readonly API = '/api/v1';

  private get headers() {
    const token = localStorage.getItem('auth_token') ?? '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  filters = [
    { label: 'BÚSQUEDAS', value: 'busquedas' },
    { label: 'NEGATIVOS', value: 'negativos' },
    { label: 'FOTOCOPIAS', value: 'fotocopias' },
    { label: 'VALIDACIONES', value: 'validaciones' },
    { label: 'TODOS', value: 'todos' },
  ];
  currentFilter = 'todos';
  fechaPago: Date | null = new Date();
  yearRanges: YearRange[] = buildYearRanges().map(r => ({ ...r, count: 0 }));
  selectedYearRange: string | null = null;
  isLoading = false;
  payments: Payment[] = [];
  private allPayments: Payment[] = [];
  private catalogoActos: Catalogo[] = [];
  private catalogoServicios: Catalogo[] = [];
  private catalogoEstados: Catalogo[] = [];

  get resultsCount(): string {
    const n = this.payments.length;
    return n === 1 ? '1 resultado' : `${n} resultados`;
  }

  constructor(private http: HttpClient, private router: Router, private cdr: ChangeDetectorRef) { }

  async ngOnInit() {
    await this.cargarCatalogos();
  }

  goHome() {
    this.router.navigate(['/']);
  }

  setFilter(value: string) {
    this.currentFilter = value;
    this.aplicarFiltros();
  }

  isYearRangeSelected(range: string): boolean {
    return this.selectedYearRange === range;
  }

  selectYearRange(range: string) {
    this.selectedYearRange = this.selectedYearRange === range ? null : range;
    this.aplicarFiltros();
  }

  async buscarPagos() {
    this.isLoading = true;
    this.allPayments = [];
    this.payments = [];
    this.selectedYearRange = null;

    try {
      const estados = ESTADOS_POR_FILTRO[this.currentFilter] ?? ESTADOS_POR_FILTRO['todos'];

      const promesas = estados.map(clave => this.cargarPorEstado(clave));
      const resultados = await Promise.all(promesas);
      const solicitudes = resultados.flat();


      this.allPayments = solicitudes.map(s => this.toPayment(s));
      this.recalcularConteos();
      this.aplicarFiltros();
      setTimeout(() => this.cdr.detectChanges(), 0);

    } catch (err) {
      console.error('Error en buscarPagos:', err);
    } finally {
      this.isLoading = false;
    }
  }

  private async cargarPorEstado(estadoClave: string): Promise<Solicitud[]> {
    const LIMIT = 100;
    let offset = 0;
    let total = Infinity;
    const acumulado: Solicitud[] = [];

    try {
      while (acumulado.length < total) {
        const url = `${this.API}/solicitudes?estado=${estadoClave}&limit=${LIMIT}&offset=${offset}`;
        const resp = await this.http
          .get<ApiResponse<Solicitud[]>>(url, { headers: this.headers })
          .toPromise();
        if (!resp?.ok || !resp.data || resp.data.length === 0) {
          break;
        }

        acumulado.push(...resp.data);

        if (resp.meta) {
          total = resp.meta.total;
          offset += LIMIT;
          if (offset >= total) break;
        } else {
          break;
        }
      }
    } catch (err) {
    }

    return acumulado;
  }

  private toPayment(s: Solicitud): Payment {
    const acto = this.catalogoActos.find(a => a.id === s.acto_registral_id);
    const servicio = this.catalogoServicios.find(sv => sv.id === s.tipo_servicio_id);
    const estado = this.catalogoEstados.find(e => e.id === s.estado_id);

    return {
      id: s.folio,
      fecha: s.fecha_recepcion ? new Date(s.fecha_recepcion).toLocaleDateString('es-MX') : '—',
      monto: '—',
      concepto: `${acto?.nombre ?? 'Acto ' + s.acto_registral_id} — ${servicio?.nombre ?? 'Servicio ' + s.tipo_servicio_id}`,
      referencia: s.folio,
      metodo: 'Línea de Captura',
      anio: this.extraerAnio(s),
      estadoClave: estado?.clave ?? String(s.estado_id),
      rawSolicitud: s,
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
        resultado = resultado.filter(
          p => p.anio >= bloque!.desde! && p.anio <= bloque!.hasta!
        );
      }
    }

    this.payments = resultado;
  }

  private async cargarCatalogos() {
    try {
      const [actos, servicios, estados] = await Promise.all([
        this.http.get<ApiResponse<Catalogo[]>>(`${this.API}/catalogos/actos-registrales`, { headers: this.headers }).toPromise(),
        this.http.get<ApiResponse<Catalogo[]>>(`${this.API}/catalogos/tipos-servicio`, { headers: this.headers }).toPromise(),
        this.http.get<ApiResponse<Catalogo[]>>(`${this.API}/catalogos/estados`, { headers: this.headers }).toPromise(),
      ]);
      this.catalogoActos = actos?.data ?? [];
      this.catalogoServicios = servicios?.data ?? [];
      this.catalogoEstados = estados?.data ?? [];
    } catch (err) {
      console.error('Error cargando catálogos:', err);
    }
  }

  imprimirComprobante(payment: Payment) {
    const urlPago = `${this.API}/solicitudes/${payment.rawSolicitud.id}/pago`;
    this.http.get<ApiResponse<{ url_pdf: string }>>(urlPago, { headers: this.headers })
      .subscribe({
        next: resp => {
          if (resp.ok && resp.data?.url_pdf) {
            window.open(resp.data.url_pdf, '_blank');
          } else {
            window.print();
          }
        },
        error: () => alert('Error al obtener el comprobante para imprimir.'),
      });
  }
}