import { Component, Inject, OnInit, Optional, ViewChild, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatAutocompleteModule, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../http';
import { FoliosRecientesService } from '../folios-recientes';

type TipoCancelacion = 'PERDIDA' | 'LIBERAR' | 'CANCELAR';

interface Catalogo {
  id: number;
  clave?: string;
  nombre: string;
}

interface SolicitudCancelacion {
  id: number;
  folio: string;
  estadoId: number;
  servicioId: number;
  servicio: string;
  tipoCertificacion: string;
  copias: string;
  nombre1: string;
  nombre2: string;
}

interface Movimiento {
  estado_anterior_id: number | null;
  estado_nuevo_id: number;
  created_at: string;
}

interface HojaValorada {
  id: number;
  folio: number;
  estado: string;
  observaciones: string;
  fecha: string;
}

@Component({
  selector: 'app-cancelacion-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatAutocompleteModule,
  ],
  templateUrl: './cancelaciones.html',
  styleUrls: ['./cancelaciones.scss'],
})
export class CancelacionDialogComponent implements OnInit {

  private readonly API = '/api/v1';

  readonly opciones: { valor: TipoCancelacion; titulo: string; desc: string; icono: string; boton: string }[] = [
    {
      valor: 'PERDIDA',
      titulo: 'Hoja perdida, necesita reimpresión',
      desc: 'La hoja se perdió o dañó. Se anula y el folio de la solicitud se imprime en una hoja nueva.',
      icono: 'report',
      boton: 'Anular por pérdida',
    },
    {
      valor: 'LIBERAR',
      titulo: 'Liberar hoja y folio',
      desc: 'La hoja física no se usó. Queda disponible y la solicitud se puede volver a imprimir.',
      icono: 'lock_open',
      boton: 'Liberar hoja',
    },
    {
      valor: 'CANCELAR',
      titulo: 'Cancelar hoja valorada',
      desc: 'Se anula la hoja y el folio de la solicitud ya no se puede reimprimir.',
      icono: 'block',
      boton: 'Cancelar hoja',
    },
  ];

  @ViewChild(MatAutocompleteTrigger) private triggerFolio?: MatAutocompleteTrigger;

  folio = '';

  readonly buscando = signal(false);
  readonly procesando = signal(false);
  readonly error = signal('');
  readonly solicitud = signal<SolicitudCancelacion | null>(null);
  readonly hoja = signal<HojaValorada | null>(null);
  readonly cargandoHoja = signal(false);
  readonly tipo = signal<TipoCancelacion | null>(null);
  readonly textoFolio = signal('');

  private readonly estados = signal<Catalogo[]>([]);
  private readonly servicios = signal<Catalogo[]>([]);

  readonly sugerenciasFolio = computed(() => {
    const t = this.textoFolio().trim().toUpperCase();
    return this.folios.lista().filter(f => !t || f.folio.toUpperCase().includes(t)).slice(0, 8);
  });

  readonly estado = computed(() => {
    const s = this.solicitud();
    if (!s) return { clave: '', nombre: '' };
    const e = this.estados().find(x => x.id === s.estadoId);
    return { clave: e?.clave ?? '', nombre: e?.nombre ?? `Estado ${s.estadoId}` };
  });

  readonly servicioNombre = computed(() => {
    const s = this.solicitud();
    if (!s) return '';
    return s.servicio || this.servicios().find(x => x.id === s.servicioId)?.nombre || '';
  });

  readonly hojaActiva = computed(() => this.hoja()?.estado === 'UTILIZADA');

  readonly opcionActual = computed(() => this.opciones.find(o => o.valor === this.tipo()) ?? null);

  private get headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${sessionStorage.getItem('token') ?? ''}` });
  }

  constructor(
    public dialogRef: MatDialogRef<CancelacionDialogComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: any,
    private http: HttpClient,
    private api: ApiService,
    public folios: FoliosRecientesService,
  ) {
    this.dialogRef.updateSize('760px');
    this.dialogRef.addPanelClass('rc-dialog');
  }

  ngOnInit(): void {
    this.api.getEstados().subscribe({ next: r => { if (r?.ok) this.estados.set(r.data ?? []); }, error: () => {} });
    this.api.getTiposServicio().subscribe({ next: r => { if (r?.ok) this.servicios.set(r.data ?? []); }, error: () => {} });
  }

  fechaCorta(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
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

  limpiar(): void {
    this.folio = '';
    this.textoFolio.set('');
    this.solicitud.set(null);
    this.hoja.set(null);
    this.tipo.set(null);
    this.error.set('');
  }

  elegirTipo(valor: TipoCancelacion): void {
    if (!this.hojaActiva()) return;
    this.tipo.set(valor);
    this.error.set('');
  }

  buscar(): void {
    const f = this.folio.trim().toUpperCase();
    if (!f) { this.error.set('Escribe un folio para buscar.'); return; }
    this.folio = f;
    this.cerrarSugerencias();

    this.buscando.set(true);
    this.error.set('');
    this.solicitud.set(null);
    this.hoja.set(null);
    this.tipo.set(null);

    this.http.get<any>(`${this.API}/solicitudes/folio/${encodeURIComponent(f)}`, { headers: this.headers })
      .subscribe({
        next: resp => {
          this.buscando.set(false);
          if (!resp?.ok || !resp.data) { this.error.set('No existe una solicitud con ese folio.'); return; }
          const d  = resp.data;
          const rb = this.parsear(d.resultado_busqueda);
          this.solicitud.set({
            id:                d.id,
            folio:             d.folio,
            estadoId:          d.estado_id,
            servicioId:        d.tipo_servicio_id,
            servicio:          rb['servicio']           ?? '',
            tipoCertificacion: rb['tipoActa']           ?? '',
            copias:            rb['copiasSolicitadas']  ?? '',
            nombre1:           rb['nombre']             ?? '',
            nombre2:           rb['nombreContrayente2'] ?? '',
          });
          this.cargarHoja(d.id);
        },
        error: err => {
          this.buscando.set(false);
          this.error.set(err?.status === 404
            ? 'No existe una solicitud con ese folio.'
            : err?.error?.error?.message ?? 'Error al buscar la solicitud.');
        }
      });
  }

  private cargarHoja(solicitudId: number): void {
    this.cargandoHoja.set(true);
    this.http.get<any>(`${this.API}/solicitudes/${solicitudId}/hoja-valorada`, { headers: this.headers })
      .subscribe({
        next: resp => {
          this.cargandoHoja.set(false);
          if (!resp?.ok || !resp.data) return;
          const h = resp.data;
          this.hoja.set({
            id: h.id,
            folio: h.folio,
            estado: h.estado ?? '',
            observaciones: h.observaciones ?? '',
            fecha: h.created_at ?? '',
          });
        },
        error: () => this.cargandoHoja.set(false),
      });
  }

  private parsear(texto: string | null): Record<string, string> {
    if (!texto) return {};
    try { return JSON.parse(texto); } catch { return {}; }
  }

  cancelarFolio(): void {
    const s = this.solicitud();
    const tipo = this.tipo();
    const op = this.opcionActual();
    if (!s || !tipo || !op) return;
    if (!this.hojaActiva()) {
      this.error.set('Esta solicitud no tiene una hoja valorada activa para cancelar.');
      return;
    }

    if (!confirm(`¿Confirmas "${op.boton}" para el folio ${s.folio} (hoja ${this.hoja()?.folio})?`)) return;

    this.procesando.set(true);
    this.error.set('');

    const motivo = tipo === 'LIBERAR'
      ? 'Hoja valorada liberada — la hoja física no se usó'
      : tipo === 'PERDIDA'
      ? 'Hoja valorada perdida — necesita reimpresión en hoja nueva'
      : 'Cancelación de hoja valorada — folio no se puede reimprimir';
    const base = `${this.API}/solicitudes/${encodeURIComponent(s.folio)}/hoja-valorada`;
    const peticion = tipo === 'LIBERAR'
      ? this.http.post<any>(`${base}/liberar`, {}, { headers: this.headers })
      : this.http.post<any>(`${base}/anular`, { motivo }, { headers: this.headers });

    peticion.subscribe({
      next: async resp => {
        if (!resp?.ok) {
          this.procesando.set(false);
          this.error.set('No se pudo completar la operación.');
          return;
        }
        const aviso = await this.ajustarEstadoSolicitud(s, tipo, motivo);
        this.procesando.set(false);
        if (aviso) {
          this.hoja.update(h => h ? { ...h, estado: tipo === 'LIBERAR' ? 'LIBERADA' : 'ANULADA' } : h);
          this.tipo.set(null);
          this.error.set(aviso);
          return;
        }
        this.dialogRef.close({ accion: 'cancelado', tipo, folio: s.folio });
      },
      error: err => {
        this.procesando.set(false);
        const code = err?.error?.error?.code;
        this.error.set(code === 'ESTADO_INVALIDO'
          ? 'Solo se pueden cancelar o liberar hojas que están en uso.'
          : err?.error?.error?.message ?? 'No se pudo completar la operación.');
      }
    });
  }

  private async ajustarEstadoSolicitud(s: SolicitudCancelacion, tipo: TipoCancelacion, motivo: string): Promise<string> {
    const accion = tipo === 'LIBERAR' ? 'liberó' : 'anuló';
    const opciones = { headers: this.headers };
    try {
      const [sol, hist, trans] = await Promise.all([
        firstValueFrom(this.http.get<any>(`${this.API}/solicitudes/${s.id}`, opciones)),
        firstValueFrom(this.http.get<any>(`${this.API}/solicitudes/${s.id}/historial`, opciones)),
        firstValueFrom(this.http.get<any>(`${this.API}/solicitudes/${s.id}/transiciones`, opciones)),
      ]);

      const actualId: number = sol?.data?.estado_id ?? s.estadoId;
      const actual = this.estados().find(e => e.id === actualId);
      const permitidas: Catalogo[] = trans?.data ?? [];

      let destino: Catalogo | undefined;
      if (tipo === 'CANCELAR') {
        destino = this.estados().find(e => e.clave === 'CANCELADA') ?? { id: 0, clave: 'CANCELADA', nombre: 'Cancelada' };
      } else {
        const desde = new Date(this.hoja()?.fecha ?? 0).getTime() - 60000;
        const ultimo = (hist?.data ?? [] as Movimiento[])
          .filter((m: Movimiento) => m.estado_nuevo_id === actualId && m.estado_anterior_id != null)
          .sort((a: Movimiento, b: Movimiento) => a.created_at.localeCompare(b.created_at))
          .pop();
        if (!ultimo || new Date(ultimo.created_at).getTime() < desde) return '';
        destino = this.estados().find(e => e.id === ultimo.estado_anterior_id);
        if (!destino) return `La hoja se ${accion}, pero no se pudo identificar el estado al que debe regresar la solicitud ${s.folio}.`;
      }

      if (actual?.clave === destino.clave) return '';
      if (!permitidas.some(t => t.clave === destino!.clave)) {
        return `La hoja se ${accion}, pero la solicitud ${s.folio} sigue en "${actual?.nombre ?? 'su estado actual'}": `
          + `no está permitida la transición a "${destino.nombre}" para tu rol.`;
      }

      await firstValueFrom(this.http.post<any>(
        `${this.API}/solicitudes/${s.id}/cambio-estado`,
        { estado_destino_clave: destino.clave, comentario: motivo },
        opciones,
      ));
      return '';
    } catch (err: any) {
      return `La hoja se ${accion}, pero no se pudo actualizar el estado de la solicitud ${s.folio}: `
        + (err?.error?.error?.message ?? 'error al cambiar el estado.');
    }
  }

  cerrar(): void {
    this.dialogRef.close();
  }
} 