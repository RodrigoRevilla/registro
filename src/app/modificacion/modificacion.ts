import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { ApiService } from '../http';
import { AuthService } from '../auth';
import { FoliosRecientesService } from '../folios-recientes';
import { fechaLocal } from '../registro-nacimiento.mapper';

interface Catalogo {
  id: number;
  clave?: string;
  nombre: string;
}

interface SolicitudDetalle {
  id: number;
  folio: string;
  acto_registral_id: number;
  tipo_servicio_id: number;
  estado_id: number;
  fecha_recepcion: string | null;
  fecha_entrega_resultado: string | null;
}

@Component({
  selector: 'app-modificacion',
  standalone: true,
  templateUrl: './modificacion.html',
  styleUrls: ['./modificacion.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatAutocompleteModule,
  ]
})
export class ModificacionComponent implements OnInit {

  private baseUrl = '/api/v1';

  formulario: FormGroup;

  readonly solicitud = signal<SolicitudDetalle | null>(null);
  readonly buscando = signal(false);
  readonly guardando = signal(false);
  readonly mensaje = signal('');
  readonly textoFolio = signal('');

  private readonly actos = signal<Catalogo[]>([]);
  private readonly servicios = signal<Catalogo[]>([]);
  private readonly estados = signal<Catalogo[]>([]);

  readonly sugerenciasFolio = computed(() => {
    const t = this.textoFolio().trim().toUpperCase();
    return this.folios.lista().filter(f => !t || f.folio.toUpperCase().includes(t)).slice(0, 8);
  });

  readonly estadoActual = computed(() => {
    const s = this.solicitud();
    if (!s) return null;
    const e = this.estados().find(x => x.id === s.estado_id);
    return { clave: e?.clave ?? String(s.estado_id), nombre: e?.nombre ?? `Estado ${s.estado_id}` };
  });

  readonly opcionesPorRol: Record<string, { value: string; label: string }[]> = {
    ADMINISTRADOR: [
      { value: 'NO_HAY_LIBRO', label: 'No hay libro' },
      { value: 'NO_HAY_FORMATO', label: 'No hay formato' },
      { value: 'NO_HAY_CUADERNO', label: 'No hay cuaderno' },
      { value: 'NO_HAY_REGISTRO', label: 'No hay registro' },
      { value: 'ENCONTRADA', label: 'Encontrada' },
      { value: 'COTEJADA', label: 'Cotejada' },
      { value: 'ACLARACION', label: 'Para aclaración' },
    ],
    JEFE_BUSQUEDAS: [
      { value: 'NO_HAY_LIBRO', label: 'No hay libro' },
      { value: 'NO_HAY_FORMATO', label: 'No hay formato' },
      { value: 'NO_HAY_CUADERNO', label: 'No hay cuaderno' },
      { value: 'NO_HAY_REGISTRO', label: 'No hay registro' },
      { value: 'ENCONTRADA', label: 'Encontrada' },
    ],
    BUSCADOR: [
      { value: 'NO_HAY_LIBRO', label: 'No hay libro' },
      { value: 'NO_HAY_FORMATO', label: 'No hay formato' },
      { value: 'NO_HAY_CUADERNO', label: 'No hay cuaderno' },
      { value: 'NO_HAY_REGISTRO', label: 'No hay registro' },
      { value: 'ENCONTRADA', label: 'Encontrada' },
    ],
    VALIDADOR: [
      { value: 'COTEJADA', label: 'Cotejada' },
      { value: 'ACLARACION', label: 'Para aclaración' },
    ],
    CERTIFICACION: [
      { value: 'COTEJADA', label: 'Cotejada' },
      { value: 'ACLARACION', label: 'Para aclaración' },
    ],
  };

  readonly opcionesEstado: { value: string; label: string }[];

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private http: HttpClient,
    private apiService: ApiService,
    private authService: AuthService,
    public folios: FoliosRecientesService,
  ) {
    const clave = this.authService.getRolClave().toUpperCase();
    const key = Object.keys(this.opcionesPorRol).find(k => clave === k);
    this.opcionesEstado = key ? this.opcionesPorRol[key] : [];

    this.formulario = this.fb.group({
      folio: [''],
      estadoSeleccionado: [''],
      servicio: [''],
      tipoActa: [''],
      anio: [''],
      aniosBusqueda: [''],
      rangoBusqueda: [''],
      fechaRegistro: [''],
      oficialia: [''],
      noActa: [''],
      noFoja: [''],
      localidad: [''],
      estadoRegistro: [''],
      distrito: [''],
      municipio: [''],
      nombres: [''],
      fechaSolicitud: [''],
      fechaEntrega: [''],
      fechaPago: [''],
      observaciones: ['']
    });

    this.formulario.get('folio')!.valueChanges.subscribe(v => this.textoFolio.set(v ?? ''));
  }

  ngOnInit(): void {
    this.apiService.getActosRegistrales().subscribe({
      next: r => { if (r?.ok) this.actos.set(r.data ?? []); },
      error: () => {},
    });
    this.apiService.getTiposServicio().subscribe({
      next: r => { if (r?.ok) this.servicios.set(r.data ?? []); },
      error: () => {},
    });
    this.apiService.getEstados().subscribe({
      next: r => { if (r?.ok) this.estados.set(r.data ?? []); },
      error: () => {},
    });
  }

  private getHeaders(): HttpHeaders | null {
    const token = this.authService.getToken();
    if (!token) { alert('Primero debes iniciar sesión'); return null; }
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private fechaISO(iso: string | null | undefined, soloDia = false): string {
    if (!iso) return '';
    const d = soloDia ? fechaLocal(iso) : new Date(iso);
    if (!d || isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`;
  }

  fechaCorta(iso: string | null | undefined, soloDia = false): string {
    if (!iso) return '—';
    const d = soloDia ? fechaLocal(iso) : new Date(iso);
    return !d || isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  nombreActo(id: number): string {
    return this.actos().find(a => a.id === id)?.nombre ?? `Acto ${id}`;
  }

  nombreServicio(id: number): string {
    return this.servicios().find(s => s.id === id)?.nombre ?? `Servicio ${id}`;
  }

  elegirFolio(folio: string): void {
    this.formulario.patchValue({ folio });
    this.buscarSolicitud();
  }

  buscarSolicitud(): void {
    const folio = (this.formulario.get('folio')?.value ?? '').trim().toUpperCase();
    if (!folio) { this.mensaje.set('Escribe un folio para buscar.'); return; }
    const headers = this.getHeaders();
    if (!headers) return;

    this.formulario.patchValue({ folio }, { emitEvent: false });
    this.buscando.set(true);
    this.mensaje.set('');
    this.solicitud.set(null);

    this.http.get<any>(`${this.baseUrl}/solicitudes/folio/${encodeURIComponent(folio)}`, { headers })
      .subscribe({
        next: resp => {
          this.buscando.set(false);
          if (!resp?.ok || !resp.data) { this.mensaje.set('No existe una solicitud con ese folio.'); return; }
          const d: SolicitudDetalle = resp.data;
          this.solicitud.set(d);
          this.formulario.patchValue({
            servicio: this.nombreServicio(d.tipo_servicio_id),
            tipoActa: this.nombreActo(d.acto_registral_id),
            anio: d.fecha_recepcion ? new Date(d.fecha_recepcion).getFullYear() : '',
            fechaRegistro: this.fechaISO(d.fecha_recepcion),
            fechaSolicitud: this.fechaISO(d.fecha_recepcion),
            fechaEntrega: this.fechaISO(d.fecha_entrega_resultado, true),
          });
          this.cargarComentarios(d.id, headers);
        },
        error: err => {
          this.buscando.set(false);
          this.mensaje.set(err?.status === 404
            ? 'No existe una solicitud con ese folio.'
            : (err?.error?.error?.message ?? 'Error al buscar la solicitud.'));
        }
      });
  }

  private cargarComentarios(id: number, headers: HttpHeaders): void {
    this.http.get<any>(`${this.baseUrl}/solicitudes/${id}/comentarios`, { headers })
      .subscribe({
        next: resp => {
          if (resp?.ok && resp.data?.length) {
            this.formulario.patchValue({ observaciones: resp.data.at(-1).comentario });
          }
        },
        error: err => console.error('[comentarios]', err)
      });
  }

  reImprimir(): void {
    const id = this.solicitud()?.id;
    if (!id) { alert('Primero busca una solicitud'); return; }
    const folioHoja = (this.formulario.get('folio')?.value ?? '').trim();
    if (!folioHoja) { alert('No hay folio para reimprimir'); return; }
    const headers = this.getHeaders();
    if (!headers) return;

    this.http.post(`${this.baseUrl}/solicitudes/${id}/impresion`, { folio_hoja_valorada: folioHoja }, { headers })
      .subscribe({
        next: () => {
          this.http.get<any>(`${this.baseUrl}/solicitudes/${id}/pago`, { headers })
            .subscribe({
              next: respPago => {
                const url = respPago?.data?.url_pdf;
                if (url) {
                  const ventana = window.open(url, '_blank', `width=${screen.width},height=${screen.height},top=0,left=0`);
                  ventana?.addEventListener('load', () => ventana.print());
                } else {
                  alert('No se encontró URL del PDF');
                }
              },
              error: err => alert('Error al obtener el PDF: ' + (err.error?.error?.message ?? 'Error desconocido'))
            });
        },
        error: err => alert('Error al registrar impresión: ' + (err.error?.error?.message ?? 'Error desconocido'))
      });
  }

  cancelar(): void {
    this.limpiarRegistro();
  }

  limpiarRegistro(): void {
    this.formulario.reset({
      folio: '', estadoSeleccionado: '', servicio: '', tipoActa: '', anio: '', aniosBusqueda: '',
      rangoBusqueda: '', fechaRegistro: '', oficialia: '', noActa: '', noFoja: '', localidad: '',
      estadoRegistro: '', distrito: '', municipio: '', nombres: '', fechaSolicitud: '', fechaEntrega: '',
      fechaPago: '', observaciones: '',
    });
    this.solicitud.set(null);
    this.mensaje.set('');
  }

  limpiarRegistroSection(): void {
    this.formulario.patchValue({ localidad: '', estadoRegistro: '', distrito: '', municipio: '' });
  }

  guardarCambios(): void {
    const headers = this.getHeaders();
    if (!headers) return;
    const id = this.solicitud()?.id;
    if (!id) { alert('Primero busca una solicitud'); return; }

    const estadoClave = this.formulario.get('estadoSeleccionado')?.value;
    const comentario = this.formulario.get('observaciones')?.value ?? '';
    const usuario = this.authService.getUsuario();
    const areaId = usuario?.area_id ?? null;

    if (!estadoClave && !comentario) {
      alert('Selecciona un resultado o escribe un comentario');
      return;
    }

    const opcionLabel = estadoClave
      ? (this.opcionesEstado.find(o => o.value === estadoClave)?.label ?? estadoClave)
      : null;
    const textoFinal = [opcionLabel, comentario].filter(Boolean).join(' — ');

    const bodyComentario: any = { comentario: textoFinal };
    if (areaId) bodyComentario.area_id = areaId;

    this.guardando.set(true);
    this.http.post(`${this.baseUrl}/solicitudes/${id}/comentarios`, bodyComentario, { headers })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          alert('Cambios guardados correctamente');
        },
        error: err => {
          this.guardando.set(false);
          alert('Error al guardar: ' + (err.error?.error?.message ?? 'Error desconocido'));
        }
      });
  }

  goHome(): void {
    this.router.navigate(['/home']);
  }
}