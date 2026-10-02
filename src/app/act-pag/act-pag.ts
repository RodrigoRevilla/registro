import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { switchMap, throwError, of, catchError, Subject, takeUntil } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { ApiService } from '../http';
import { FoliosRecientesService } from '../folios-recientes';
import { fechaLocal } from '../registro-nacimiento.mapper';

interface Solicitud {
  id: number;
  solicitud: string;
  status: string;
  estadoId: number;
  actoId: number;
  servicioId: number;
  lineaCaptura: string;
  urlPdf: string;
  fechaEntregaHora?: string;
  fechaSolicitudHora?: string;
  aniosBusqueda?: string;
  oficialia?: string;
  numeroActa?: string;
  numeroFoja?: string;
  fechaRegistro?: string;
  lugarRegistro?: string;
  rangoBusqueda?: string;
  estadoBiologico?: string;
  estadoActa?: string;
  documentoPresentado?: string;
  nombres?: string;
  crip?: string;
  sexo?: string;
  copiasSolicitadas?: string;
  tipoActa?: string;
}

interface Catalogo {
  id: number;
  clave?: string;
  nombre: string;
}

const ESTADOS_MAP: Record<number, string> = {
  1: 'RECIBIDA',
  2: 'PENDIENTE_PAGO',
  3: 'PAGADA',
  4: 'CERTIFICACION_EMITIDA',
  5: 'PENDIENTE_ASIGNACION',
  6: 'ASIGNADA',
  7: 'EN_BUSQUEDA',
  8: 'EN_CERTIFICACION',
  9: 'EN_VALIDACION',
  10: 'VALIDADA',
  11: 'LISTA_ENTREGA',
  12: 'ENTREGADA',
  13: 'NO_ENCONTRADA',
  14: 'RECHAZADA',
  15: 'CANCELADA',
};

const MENSAJES_ESTADO: Record<string, string> = {
  PAGADA: 'Este folio ya fue pagado.',
  PENDIENTE_ASIGNACION: 'Este folio ya fue pagado y está pendiente de asignación.',
  ASIGNADA: 'Este folio ya fue pagado y tiene buscador asignado.',
  CERTIFICACION_EMITIDA: 'Este folio ya fue certificado.',
  EN_BUSQUEDA: 'Este folio ya fue pagado y está en búsqueda.',
  EN_CERTIFICACION: 'Este folio ya fue pagado y está en certificación.',
  EN_VALIDACION: 'Este folio ya fue pagado y está en validación.',
  VALIDADA: 'Este folio ya fue pagado y está validado.',
  LISTA_ENTREGA: 'Este folio ya fue pagado y está listo para entrega.',
  ENTREGADA: 'Este folio ya fue pagado y entregado.',
  CANCELADA: 'Este folio fue cancelado.',
  RECHAZADA: 'Este folio fue rechazado.',
  NO_ENCONTRADA: 'Este folio fue marcado como no encontrado.',
};

const TERMINALES_NEGATIVOS = ['CANCELADA', 'RECHAZADA', 'NO_ENCONTRADA'];

@Component({
  selector: 'app-consulta-pago',
  templateUrl: './act-pag.html',
  styleUrls: ['./act-pag.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatAutocompleteModule,
  ]
})
export class ConsultaPagoComponent implements OnInit, OnDestroy {

  folioBuscar = '';
  transiciones: any[] = [];

  readonly solicitud = signal<Solicitud | null>(null);
  readonly procesando = signal(false);
  readonly confirmando = signal(false);
  readonly mensaje = signal('');
  readonly textoFolio = signal('');

  private readonly actos = signal<Catalogo[]>([]);
  private readonly servicios = signal<Catalogo[]>([]);
  private readonly estados = signal<Catalogo[]>([]);

  readonly sugerenciasFolio = computed(() => {
    const t = this.textoFolio().trim().toUpperCase();
    return this.folios.lista().filter(f => !t || f.folio.toUpperCase().includes(t)).slice(0, 8);
  });

  readonly estadoNombre = computed(() => {
    const s = this.solicitud();
    if (!s) return '';
    const e = this.estados().find(x => x.id === s.estadoId || x.clave === s.status);
    return e?.nombre ?? s.status.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase());
  });

  readonly tipoAviso = computed<'pendiente' | 'pagado' | 'negativo' | null>(() => {
    const s = this.solicitud();
    if (!s) return null;
    if (s.status === 'PENDIENTE_PAGO') return 'pendiente';
    if (TERMINALES_NEGATIVOS.includes(s.status)) return 'negativo';
    return 'pagado';
  });

  readonly textoAviso = computed(() => {
    const s = this.solicitud();
    if (!s) return '';
    if (s.status === 'PENDIENTE_PAGO') return 'Pago pendiente. Confirma el pago cuando el contribuyente lo haya realizado.';
    return MENSAJES_ESTADO[s.status] ?? `Estado actual: ${this.estadoNombre()}.`;
  });

  readonly detalles = computed(() => {
    const s = this.solicitud();
    if (!s) return [];
    return [
      { etiqueta: 'Nombre(s)', valor: s.nombres },
      { etiqueta: 'CRIP', valor: s.crip },
      { etiqueta: 'Sexo', valor: s.sexo },
      { etiqueta: 'Tipo de acta', valor: s.tipoActa },
      { etiqueta: 'Oficialía', valor: s.oficialia },
      { etiqueta: 'No. de acta', valor: s.numeroActa },
      { etiqueta: 'No. de foja', valor: s.numeroFoja },
      { etiqueta: 'Fecha de registro', valor: s.fechaRegistro ? this.fechaCorta(s.fechaRegistro, true) : '' },
      { etiqueta: 'Lugar de registro', valor: s.lugarRegistro },
      { etiqueta: 'Años de búsqueda', valor: s.aniosBusqueda },
      { etiqueta: 'Rango de búsqueda', valor: s.rangoBusqueda },
      { etiqueta: 'Estado biológico', valor: s.estadoBiologico },
      { etiqueta: 'Estado del acta', valor: s.estadoActa },
      { etiqueta: 'Documento presentado', valor: s.documentoPresentado },
      { etiqueta: 'Copias solicitadas', valor: s.copiasSolicitadas },
    ].filter(d => !!d.valor);
  });

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private apiService: ApiService,
    public folios: FoliosRecientesService,
  ) { }

  ngOnInit(): void {
    this.apiService.getActosRegistrales().pipe(takeUntil(this.destroy$)).subscribe({
      next: r => { if (r?.ok) this.actos.set(r.data ?? []); },
      error: () => {},
    });
    this.apiService.getTiposServicio().pipe(takeUntil(this.destroy$)).subscribe({
      next: r => { if (r?.ok) this.servicios.set(r.data ?? []); },
      error: () => {},
    });
    this.apiService.getEstados().pipe(takeUntil(this.destroy$)).subscribe({
      next: r => { if (r?.ok) this.estados.set(r.data ?? []); },
      error: () => {},
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  goHome() {
    this.router.navigate(['/home']);
  }

  fechaCorta(iso: string | null | undefined, soloDia = false): string {
    if (!iso) return '—';
    const d = soloDia ? fechaLocal(iso) : new Date(iso);
    return !d || isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  horaCorta(iso: string | null | undefined): string {
    if (!iso) return '';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  }

  nombreActo(id: number): string {
    return this.actos().find(a => a.id === id)?.nombre ?? `Acto ${id}`;
  }

  nombreServicio(id: number): string {
    return this.servicios().find(s => s.id === id)?.nombre ?? `Servicio ${id}`;
  }

  onFolioInput(valor: string): void {
    this.folioBuscar = valor;
    this.textoFolio.set(valor);
  }

  elegirFolio(folio: string): void {
    this.folioBuscar = folio;
    this.textoFolio.set(folio);
    this.buscarFolio();
  }

  limpiar(): void {
    this.folioBuscar = '';
    this.textoFolio.set('');
    this.solicitud.set(null);
    this.mensaje.set('');
    this.transiciones = [];
  }

  buscarFolio() {
    const folio = this.folioBuscar.trim().toUpperCase();
    if (!folio) { this.mensaje.set('Escribe un folio para buscar.'); return; }
    if (this.procesando()) return;
    this.folioBuscar = folio;

    this.procesando.set(true);
    this.mensaje.set('');
    this.solicitud.set(null);
    this.transiciones = [];

    this.apiService.getSolicitudPorFolio(folio).pipe(
      takeUntil(this.destroy$),
      switchMap(res => {
        if (!res?.data) return throwError(() => ({ status: 404 }));
        const solicitud = this.mapearSolicitud(res.data);
        this.solicitud.set(solicitud);
        return this.apiService.getPago(solicitud.id).pipe(
          catchError(() => of({ data: null })),
          switchMap(pagoRes => {
            const actual = this.solicitud();
            if (pagoRes?.data && actual) {
              this.solicitud.set({
                ...actual,
                lineaCaptura: pagoRes.data.referencia_pago || '',
                urlPdf: pagoRes.data.url_pdf || '',
              });
            }
            const id = this.solicitud()?.id;
            if (!id) return of({ data: [] });
            return this.apiService.getTransiciones(id).pipe(catchError(() => of({ data: [] })));
          })
        );
      })
    ).subscribe({
      next: transRes => {
        this.transiciones = (transRes as any)?.data || [];
        this.procesando.set(false);
      },
      error: err => {
        this.procesando.set(false);
        this.solicitud.set(null);
        this.mensaje.set(err?.status === 404
          ? 'No existe una solicitud con ese folio.'
          : (err?.error?.error?.message ?? 'Error al buscar la solicitud.'));
      }
    });
  }

  private mapearSolicitud(data: any): Solicitud {
    return {
      id: data.id,
      solicitud: data.folio || '',
      status: ESTADOS_MAP[data.estado_id] || 'DESCONOCIDO',
      estadoId: data.estado_id,
      actoId: data.acto_registral_id,
      servicioId: data.tipo_servicio_id,
      lineaCaptura: '',
      urlPdf: '',
      fechaEntregaHora: data.fecha_entrega_resultado || '',
      fechaSolicitudHora: data.fecha_recepcion || '',
      aniosBusqueda: data.aniosBusqueda || '',
      oficialia: data.oficialia || '',
      numeroActa: data.numeroActa || '',
      numeroFoja: data.numeroFoja || '',
      fechaRegistro: data.fechaRegistro || '',
      lugarRegistro: data.lugarRegistro || '',
      rangoBusqueda: data.rangoBusqueda || '',
      estadoBiologico: data.estadoBiologico || '',
      estadoActa: data.estadoActa || '',
      documentoPresentado: data.documentoPresentado || '',
      nombres: data.nombres || '',
      crip: data.crip || '',
      sexo: data.sexo || '',
      copiasSolicitadas: data.copiasSolicitadas || '',
      tipoActa: data.tipoActa || ''
    };
  }

  cargarTransiciones() {
    const id = this.solicitud()?.id;
    if (!id) return;
    this.apiService.getTransiciones(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: res => this.transiciones = res.data || [],
      error: err => console.error('Error transiciones:', err)
    });
  }

  cambiarEstado(transicion: any) {
    const id = this.solicitud()?.id;
    if (!id) return;

    let comentario = '';
    if (transicion.requiere_comentario) {
      comentario = prompt('Ingrese comentario obligatorio') || '';
      if (!comentario.trim()) { alert('Comentario requerido'); return; }
    }

    this.procesando.set(true);

    this.apiService.cambiarEstado(id, transicion.clave, comentario).pipe(takeUntil(this.destroy$)).subscribe({
      next: res => {
        const actual = this.solicitud();
        if (actual) this.solicitud.set({ ...actual, status: res.data.EstadoNuevo });
        this.procesando.set(false);
        this.cargarTransiciones();
        alert(`Estado actualizado a ${res.data.EstadoNuevo}`);
      },
      error: err => {
        this.procesando.set(false);
        alert(err.error?.error?.message || 'Error al cambiar estado');
      }
    });
  }

  confirmarPagoManual() {
    const actual = this.solicitud();
    if (!actual?.id) { alert('ID de solicitud inválido.'); return; }

    this.confirmando.set(true);

    this.apiService.confirmarPago(actual.id).pipe(
      takeUntil(this.destroy$),
      switchMap(res => {
        if (!res?.data?.verificado) {
          alert(`${res?.data?.mensaje ?? 'Pago no verificado'}`);
          this.confirmando.set(false);
          return of(null);
        }
        return this.apiService.getSolicitudPorFolio(actual.solicitud);
      })
    ).subscribe({
      next: res => {
        if (!res) return;
        if (res?.data) {
          const previa = this.solicitud();
          this.solicitud.set({
            ...this.mapearSolicitud(res.data),
            lineaCaptura: previa?.lineaCaptura || '',
            urlPdf: previa?.urlPdf || '',
          });
        }
        this.cargarTransiciones();
        this.confirmando.set(false);
        alert('Pago confirmado exitosamente');
      },
      error: err => {
        let mensaje = 'Error desconocido al confirmar el pago.';
        if (err.status === 0) mensaje = 'Error de conexión';
        else if (err.status === 422) mensaje = 'ID inválido o sin pago asociado';
        else if (err.error?.error?.message) mensaje = err.error.error.message;
        else if (err.error?.message) mensaje = err.error.message;
        alert(mensaje);
        this.confirmando.set(false);
      }
    });
  }

  imprimirPago() {
    const s = this.solicitud();
    if (!s) return;
    const urlPdf = s.urlPdf
      || (s.lineaCaptura ? `https://impresionsiox.finanzasoaxaca.gob.mx:443/jasper/${s.lineaCaptura}.pdf` : '');
    if (!urlPdf) { alert('Esta solicitud no tiene hoja de pago.'); return; }
    const ventana = window.open(urlPdf, '_blank', 'width=900,height=700');
    ventana?.addEventListener('load', () => ventana.print());
  }
}