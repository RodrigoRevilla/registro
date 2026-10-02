import { Component, OnInit, ViewChild, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatAutocompleteModule, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { ApiService } from '../http';
import { FoliosRecientesService } from '../folios-recientes';
import { fechaLocal } from '../registro-nacimiento.mapper';

const SK_FOLIO_ACTUAL = 'imp_folio_actual';
const SK_FOLIO_USADOS = 'imp_folios_usados';
const SK_BLOQUEADO    = 'imp_bloqueado';

interface Solicitud {
  id: number;
  folio: string;
  acto_registral_id: number;
  tipo_servicio_id: number;
  estado_id: number;
  fecha_recepcion: string;
  fecha_entrega_resultado: string;
  resultado_busqueda: string | null;
}

interface Catalogo {
  id: number;
  clave?: string;
  nombre: string;
}

export interface DatosSolicitud {
  folio: string;
  oficialia: string;
  noActa: string;
  fechaRegistro: string;
  lugarRegistro: string;
  nombreRegistrado: string;
  lugarNacimiento: string;
  edad: string;
  nacionalidad: string;
  padre: string;
  nacionalidadPadre: string;
  madre: string;
  nacionalidadMadre: string;
  sexo: string;
  nombreContrayente2?: string;
  lugarNacimiento2?: string;
  edad2?: string;
  nacionalidad2?: string;
  padre2?: string;
  nacionalidadPadre2?: string;
  madre2?: string;
  nacionalidadMadre2?: string;
  sexo2?: string;
  anotaciones?: string;
  copias?: number;
  rawSolicitud: Solicitud;
}

interface Campo {
  etiqueta: string;
  valor: string | number | undefined;
  ancho?: boolean;
}

@Component({
  selector: 'app-impresiones-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatAutocompleteModule,
  ],
  templateUrl: './impresiones.html',
  styleUrls: ['./impresiones.scss'],
})
export class ImpresionesComponent implements OnInit {

  private readonly API = '/api/v1';

  @ViewChild(MatAutocompleteTrigger) private triggerFolio?: MatAutocompleteTrigger;

  folio = '';
  folioHV: number | null = null;
  observacionesHV = '';

  readonly buscando = signal(false);
  readonly ligando = signal(false);
  readonly error = signal('');
  readonly exito = signal('');
  readonly datos = signal<DatosSolicitud | null>(null);
  readonly textoFolio = signal('');
  readonly siguienteHV = signal<number | null>(null);

  private readonly estados = signal<Catalogo[]>([]);
  private readonly servicios = signal<Catalogo[]>([]);

  readonly sugerenciasFolio = computed(() => {
    const t = this.textoFolio().trim().toUpperCase();
    return this.folios.lista().filter(f => !t || f.folio.toUpperCase().includes(t)).slice(0, 8);
  });

  readonly estadoNombre = computed(() => {
    const d = this.datos();
    if (!d) return '';
    return this.estados().find(e => e.id === d.rawSolicitud.estado_id)?.nombre ?? `Estado ${d.rawSolicitud.estado_id}`;
  });

  readonly estadoClave = computed(() => {
    const d = this.datos();
    if (!d) return '';
    return this.estados().find(e => e.id === d.rawSolicitud.estado_id)?.clave ?? '';
  });

  readonly servicioNombre = computed(() => {
    const d = this.datos();
    if (!d) return '';
    return this.servicios().find(s => s.id === d.rawSolicitud.tipo_servicio_id)?.nombre ?? '';
  });

  readonly camposActa = computed<Campo[]>(() => {
    const d = this.datos();
    if (!d) return [];
    return this.soloConValor([
      { etiqueta: 'Oficialía', valor: d.oficialia },
      { etiqueta: 'No. de acta', valor: d.noActa },
      { etiqueta: 'Fecha de registro', valor: this.fechaTexto(d.fechaRegistro) },
      { etiqueta: 'Copias', valor: d.copias },
      { etiqueta: 'Lugar de registro', valor: d.lugarRegistro, ancho: true },
    ]);
  });

  readonly camposPersona1 = computed<Campo[]>(() => {
    const d = this.datos();
    if (!d) return [];
    return this.soloConValor([
      { etiqueta: 'Lugar de nacimiento', valor: d.lugarNacimiento, ancho: true },
      { etiqueta: 'Edad', valor: d.edad },
      { etiqueta: 'Sexo', valor: d.sexo },
      { etiqueta: 'Nacionalidad', valor: d.nacionalidad },
      { etiqueta: 'Padre', valor: d.padre },
      { etiqueta: 'Nac. padre', valor: d.nacionalidadPadre },
      { etiqueta: 'Madre', valor: d.madre },
      { etiqueta: 'Nac. madre', valor: d.nacionalidadMadre },
    ]);
  });

  readonly camposPersona2 = computed<Campo[]>(() => {
    const d = this.datos();
    if (!d) return [];
    return this.soloConValor([
      { etiqueta: 'Lugar de nacimiento', valor: d.lugarNacimiento2, ancho: true },
      { etiqueta: 'Edad', valor: d.edad2 },
      { etiqueta: 'Sexo', valor: d.sexo2 },
      { etiqueta: 'Nacionalidad', valor: d.nacionalidad2 },
      { etiqueta: 'Padre', valor: d.padre2 },
      { etiqueta: 'Nac. padre', valor: d.nacionalidadPadre2 },
      { etiqueta: 'Madre', valor: d.madre2 },
      { etiqueta: 'Nac. madre', valor: d.nacionalidadMadre2 },
    ]);
  });

  private get headers(): HttpHeaders {
    const token = sessionStorage.getItem('token') ?? '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  constructor(
    public dialogRef: MatDialogRef<ImpresionesComponent>,
    private http: HttpClient,
    private api: ApiService,
    public folios: FoliosRecientesService,
  ) {
    this.dialogRef.updateSize('820px');
    this.dialogRef.addPanelClass('rc-dialog');
    this.restaurarDesdeSession();
  }

  ngOnInit(): void {
    this.api.getEstados().subscribe({ next: r => { if (r?.ok) this.estados.set(r.data ?? []); }, error: () => {} });
    this.api.getTiposServicio().subscribe({ next: r => { if (r?.ok) this.servicios.set(r.data ?? []); }, error: () => {} });
  }

  private soloConValor(campos: Campo[]): Campo[] {
    return campos.filter(c => c.valor !== undefined && c.valor !== null && `${c.valor}`.trim() !== '');
  }

  private fechaTexto(valor: string): string {
    if (!valor) return '';
    const d = fechaLocal(valor);
    return d ? d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }) : valor;
  }

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

  private restaurarDesdeSession(): void {
    if (sessionStorage.getItem(SK_BLOQUEADO) !== '1') return;
    const n = this.leerFolioActual();
    if (n) this.siguienteHV.set(this.siguienteLibre(n));
  }

  private marcarUsado(folioHV: number): void {
    const usados = this.leerUsados();
    usados.add(folioHV);
    sessionStorage.setItem(SK_FOLIO_USADOS, JSON.stringify([...usados]));
    sessionStorage.setItem(SK_FOLIO_ACTUAL, String(folioHV + 1));
    sessionStorage.setItem(SK_BLOQUEADO, '1');
    this.siguienteHV.set(this.siguienteLibre(folioHV + 1));
  }

  private cerrarSugerencias(): void {
    this.triggerFolio?.closePanel();
    setTimeout(() => this.triggerFolio?.closePanel(), 0);
  }

  onFolioInput(valor: string): void {
    this.folio = valor;
    this.textoFolio.set(valor);
  }

  elegirFolio(folio: string): void {
    this.folio = folio;
    this.textoFolio.set(folio);
    this.buscar();
  }

  buscar(): void {
    const f = this.folio.trim().toUpperCase();
    if (!f) { this.error.set('Escribe un folio para buscar.'); return; }
    this.folio = f;
    this.cerrarSugerencias();

    this.buscando.set(true);
    this.error.set('');
    this.exito.set('');
    this.datos.set(null);

    this.http.get<any>(`${this.API}/solicitudes/folio/${encodeURIComponent(f)}`, { headers: this.headers })
      .subscribe({
        next: resp => {
          this.buscando.set(false);
          if (!resp?.ok || !resp.data) { this.error.set('No existe una solicitud con ese folio.'); return; }
          this.datos.set(this.armarDatos(resp.data));
          this.folioHV = this.siguienteHV();
          this.observacionesHV = '';
        },
        error: err => {
          this.buscando.set(false);
          const code = err?.error?.error?.code;
          this.error.set(code === 'NO_ENCONTRADO' || err?.status === 404
            ? 'No existe una solicitud con ese folio.'
            : err?.error?.error?.message ?? 'Error al buscar la solicitud.');
        }
      });
  }

  private parsearResultado(texto: string | null): Record<string, string> {
    if (!texto) return {};
    try { return JSON.parse(texto); } catch { return {}; }
  }

  private armarDatos(solicitud: Solicitud): DatosSolicitud {
    const rb = this.parsearResultado(solicitud.resultado_busqueda);
    return {
      folio:              solicitud.folio,
      oficialia:          rb['oficialia']          ?? '',
      noActa:             rb['acta']               ?? '',
      fechaRegistro:      rb['fechaRegistro']      ?? '',
      lugarRegistro:      rb['lugarRegistro']      ?? [rb['localidad'], rb['municipio'], rb['distrito']].filter(Boolean).join(' '),
      nombreRegistrado:   rb['nombre']             ?? '',
      lugarNacimiento:    rb['lugarNacimiento']    ?? rb['municipio'] ?? '',
      edad:               rb['edad']               ?? '',
      nacionalidad:       rb['nacionalidad']       ?? '',
      padre:              rb['padre']              ?? '',
      nacionalidadPadre:  rb['nacionalidadPadre']  ?? '',
      madre:              rb['madre']              ?? '',
      nacionalidadMadre:  rb['nacionalidadMadre']  ?? '',
      sexo:               rb['sexo']               ?? '',
      nombreContrayente2: rb['nombreContrayente2'] ?? undefined,
      lugarNacimiento2:   rb['lugarNacimiento2']   ?? undefined,
      edad2:              rb['edad2']              ?? undefined,
      nacionalidad2:      rb['nacionalidad2']      ?? undefined,
      padre2:             rb['padre2']             ?? undefined,
      nacionalidadPadre2: rb['nacionalidadPadre2'] ?? undefined,
      madre2:             rb['madre2']             ?? undefined,
      nacionalidadMadre2: rb['nacionalidadMadre2'] ?? undefined,
      sexo2:              rb['sexo2']              ?? undefined,
      anotaciones:        rb['anotaciones']        ?? '',
      copias:             rb['copiasSolicitadas'] ? Number(rb['copiasSolicitadas']) : 1,
      rawSolicitud:       solicitud,
    };
  }

  ligar(): void {
    const d = this.datos();
    if (!d) return;
    const folioHV = Number(this.folioHV);
    if (!folioHV || folioHV <= 0 || !Number.isInteger(folioHV)) {
      this.error.set('Escribe un folio de hoja valorada válido (número entero mayor a 0).');
      return;
    }

    this.ligando.set(true);
    this.error.set('');
    this.exito.set('');

    this.http.post<any>(
      `${this.API}/solicitudes/${d.rawSolicitud.id}/hoja-valorada`,
      { folio: folioHV, observaciones: this.observacionesHV || '' },
      { headers: this.headers }
    ).subscribe({
      next: resp => {
        this.ligando.set(false);
        if (resp?.ok) {
          this.marcarUsado(folioHV);
          this.exito.set(`Hoja valorada ${folioHV} ligada correctamente a ${d.folio}.`);
          this.folioHV = this.siguienteHV();
          this.observacionesHV = '';
        } else {
          this.error.set('Error al ligar la hoja valorada.');
        }
      },
      error: err => {
        this.ligando.set(false);
        const code = err?.error?.error?.code;
        this.error.set(code === 'FOLIO_DUPLICADO'
          ? `El folio ${folioHV} ya está en uso. Usa uno diferente o libéralo primero desde Cancelar certificaciones.`
          : code === 'HOJA_YA_ASIGNADA'
          ? 'Esta solicitud ya tiene una hoja valorada asignada.'
          : code === 'FOLIO_SIN_LOTE'
          ? `El folio ${folioHV} no pertenece a ningún lote registrado.`
          : err?.error?.error?.message ?? 'Error desconocido al ligar.');
      }
    });
  }

  limpiar(): void {
    this.folio = '';
    this.textoFolio.set('');
    this.datos.set(null);
    this.error.set('');
    this.exito.set('');
  }

  cerrar(): void {
    this.dialogRef.close();
  }
}