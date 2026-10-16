import { Component, OnInit, OnDestroy, ElementRef, HostListener, ViewChild, WritableSignal, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { OverlayModule } from '@angular/cdk/overlay';
import { Subject, takeUntil } from 'rxjs';
import { DefuncionDetalleComponent } from '../defuncion-detalle/defuncion-detalle';
import { ApiService, BusquedaDefuncion, RegistroDefuncion } from '../http';
import { AuthService } from '../auth';
import { CatalogoMunicipiosService } from '../catalogo-municipios';
import { FoliosRecientesService, HojaGenerada, leerHojaGenerada } from '../folios-recientes';
import { AvisosService } from '../avisos';
import { ENTIDADES, ENTIDADES_INEGI, municipioTexto, municipioVisible, normalizar } from '../registro-nacimiento.mapper';
import {
  actaDefuncion,
  fechaDefuncion,
  formularioARegistroDefuncion,
  nombreFinado,
  registroDefuncionAFormulario,
} from '../registro-defuncion.mapper';

interface Distrito { id_distrito: number; id_region: number; nombre: string; }
interface Municipio { id_municipio: number; id_distrito: number; nombre: string; }

const ROLES_EDICION = ['ADMINISTRADOR', 'VALIDADOR'];

@Component({
  selector: 'app-defunciones',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatAutocompleteModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatIconModule,
    OverlayModule
  ],
  templateUrl: './defunciones.html',
  styleUrls: ['../nacimiento/nacimiento.scss', './defunciones.scss'],
  host: {
    style: 'display: flex; flex-direction: column; height: 100%; overflow: hidden; min-height: 0;'
  }
})
export class DefuncionesComponent implements OnInit, OnDestroy {
  private readonly avisos = inject(AvisosService);

  readonly hojaGenerada = signal<HojaGenerada | null>(leerHojaGenerada());

  reimprimirHoja(url: string): void {
    const ventana = window.open(url, '_blank', `width=${screen.width},height=${screen.height},top=0,left=0`);
    ventana?.addEventListener('load', () => ventana.print());
  }

  @ViewChild('capturaRef') capturaRef?: ElementRef<HTMLElement>;
  @ViewChild('ayudaInput') ayudaInput?: ElementRef<HTMLInputElement>;

  busquedaForm: FormGroup;
  defuncionForm: FormGroup;
  entidades = ENTIDADES;
  entidadesInegi = ENTIDADES_INEGI;

  readonly entidadDefault = 20;

  modoBusqueda = signal<'registrales' | 'personales'>('personales');
  filtroDistritoBusqueda = signal('');
  filtroMunicipioBusqueda = signal('');
  entidadBusqueda = signal(20);
  municipiosBusqueda = computed(() =>
    this.entidadBusqueda() === this.entidadDefault
      ? this.filtrarMunicipios(this.filtroMunicipioBusqueda()).slice(0, 50)
      : []
  );
  ayudaMunicipios = signal(false);
  filtroAyuda = signal('');
  municipiosAyuda = computed(() => this.filtrarMunicipios(this.filtroAyuda()));

  distritosBusqueda = computed(() =>
    this.entidadBusqueda() === this.entidadDefault ? this.filtrarPorNombre(this.distritos(), this.filtroDistritoBusqueda()) : []
  );
  distritoElegido = computed(() => {
    if (this.entidadBusqueda() !== this.entidadDefault) return null;
    const q = normalizar(this.filtroDistritoBusqueda());
    return q ? this.distritos().find(d => normalizar(d.nombre) === q) ?? null : null;
  });

  municipioElegido = computed(() =>
    this.entidadBusqueda() === this.entidadDefault ? this.resolverMunicipioBusqueda(this.filtroMunicipioBusqueda()) : null
  );

  readonly pageSize = 20;

  resultados = signal<RegistroDefuncion[]>([]);
  total = signal(0);
  offset = signal(0);
  buscando = signal(false);
  guardando = signal(false);
  busquedaHecha = signal(false);
  mensajeError = signal('');
  registroId = signal<number | null>(null);
  mostrarCaptura = signal(false);

  paginaActual = computed(() => Math.floor(this.offset() / this.pageSize) + 1);
  totalPaginas = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize)));

  private readonly catMun = inject(CatalogoMunicipiosService);
  readonly folios = inject(FoliosRecientesService);

  distritos = signal<Distrito[]>([]);
  municipios = this.catMun.lista;
  filtroDistrito = signal('');
  filtroMunicipio = signal('');

  distritosFiltrados = computed(() => this.filtrarPorNombre(this.distritos(), this.filtroDistrito()));
  municipiosFiltrados = computed(() =>
    this.filtrarPorNumeroONombre(this.municipiosDeDistrito(this.filtroDistrito()), this.filtroMunicipio())
  );

  private originalMunicipio = { id: '', texto: '' };
  private tiposServicio: any[] = [];

  readonly puedeEditar = signal(false);

  private ultimaBusqueda: BusquedaDefuncion = {};
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private dialog: MatDialog,
    private api: ApiService,
    private auth: AuthService,
  ) {
    this.busquedaForm = this.fb.group({
      entidad: [this.entidadDefault],
      distrito: [''],
      municipio: [''],
      oficialia: [''],
      numeroActa: [''],
      anioRegistro: [''],
      llave: [''],
      nombre: [''],
      apellidoPaterno: [''],
      apellidoMaterno: [''],
    });

    this.aMayusculas(this.busquedaForm, 'llave');

    this.busquedaForm.get('distrito')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(v => {
      this.filtroDistritoBusqueda.set(typeof v === 'string' ? v : '');
    });

    this.busquedaForm.get('municipio')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(v => {
      this.filtroMunicipioBusqueda.set(typeof v === 'string' ? v : '');
    });

    this.busquedaForm.get('entidad')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(v => {
      this.entidadBusqueda.set(Number(v) || 0);
      if (Number(v) !== this.entidadDefault) this.cerrarAyudaMunicipios();
    });

    this.defuncionForm = this.fb.group({
      entidad: [''],
      distrito: [''],
      municipioId: [''],
      municipio: [''],
      oficialia: [''],
      localidad: [''],
      tipoDefuncion: [''],
      numeroActa: [''],
      anioRegistro: [''],
      fechaRegistro: [''],
      llave: [''],
      foja: [''],
      libro: [''],
      status: [''],
      entidadDefuncion: [''],
      municipioDefuncion: [''],
      distritoDefuncion: [''],
      localidadDefuncion: [''],
      fechaDefuncion: [''],
      nombre: [''],
      apellidoPaterno: [''],
      apellidoMaterno: [''],
      sexo: [''],
      edad: [''],
    });

    this.aMayusculas(this.defuncionForm, 'llave');

    this.defuncionForm.get('fechaRegistro')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((fecha: string) => {
      const anio = /^(\d{4})-/.exec(fecha ?? '')?.[1];
      if (anio) this.defuncionForm.patchValue({ anioRegistro: anio }, { emitEvent: false });
    });

    this.enlazarFiltro('distrito', this.filtroDistrito);
    this.enlazarFiltro('municipioId', this.filtroMunicipio);
    this.sincronizarMunicipio('municipioId', 'municipio');
  }

  ngOnInit(): void {
    this.permisoEdicion();
    this.cargarCatalogos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private aMayusculas(form: FormGroup, control: string): void {
    form.get(control)?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(val => {
      if (val && val !== val.toUpperCase()) form.get(control)?.setValue(val.toUpperCase(), { emitEvent: false });
    });
  }

  private enlazarFiltro(control: string, destino: WritableSignal<string>): void {
    this.defuncionForm.get(control)?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(v => {
      destino.set(typeof v === 'string' ? v : '');
    });
  }

  private cargarCatalogos(): void {
    this.api.getDistritos().pipe(takeUntil(this.destroy$)).subscribe({
      next: resp => this.distritos.set((resp?.data ?? []).filter((d: Distrito) => `${d.nombre ?? ''}`.trim())),
      error: err => console.error('Error catálogo distritos:', err?.status),
    });
    this.api.getTiposServicio().pipe(takeUntil(this.destroy$)).subscribe({
      next: resp => { if (resp?.ok) this.tiposServicio = resp.data ?? []; },
      error: err => console.error('Error tipos de servicio:', err?.status),
    });
    this.catMun.cargar();
  }

  private sincronizarMunicipio(controlNumero: string, controlTexto: string): void {
    this.defuncionForm.get(controlNumero)?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(v => {
      const limpio = `${v ?? ''}`.replace(/\D/g, '');
      if (limpio !== `${v ?? ''}`) {
        this.defuncionForm.get(controlNumero)?.setValue(limpio, { emitEvent: false });
      }
      const m = this.catMun.buscar(limpio);
      this.defuncionForm.get(controlTexto)?.setValue(m ? normalizar(m.nombre) : '', { emitEvent: false });
    });
  }

  private filtrarPorNumeroONombre(lista: Municipio[], texto: string): Municipio[] {
    const q = normalizar(texto);
    const orden = [...lista].sort((a, b) => a.id_municipio - b.id_municipio);
    if (!q) return orden.slice(0, 50);
    if (/^\d+$/.test(q)) {
      return orden.filter(m => this.numeroMunicipio(m).startsWith(q) || `${m.id_municipio}`.startsWith(q)).slice(0, 50);
    }
    return orden.filter(m => normalizar(m.nombre).includes(q)).slice(0, 50);
  }

  private filtrarPorNombre<T extends { nombre: string }>(lista: T[], texto: string): T[] {
    const n = normalizar(texto);
    const res = n ? lista.filter(x => normalizar(x.nombre).includes(n)) : lista;
    return res.slice(0, 50);
  }

  private filtrarMunicipios(texto: string): Municipio[] {
    const distrito = this.distritoElegido();
    const base = distrito ? this.municipios().filter(m => m.id_distrito === distrito.id_distrito) : this.municipios();
    const lista = [...base].sort((a, b) => a.id_municipio - b.id_municipio);
    const q = normalizar(texto);
    if (!q) return lista;
    if (/^\d+$/.test(q)) {
      return lista.filter(m => this.numeroMunicipio(m).startsWith(q) || `${m.id_municipio}`.startsWith(q));
    }
    return lista.filter(m => normalizar(m.nombre).includes(q));
  }

  numeroMunicipio(m: Municipio): string {
    return `${m.id_municipio}`.padStart(3, '0');
  }

  abrirAyudaMunicipios(): void {
    if (this.ayudaMunicipios()) {
      this.cerrarAyudaMunicipios();
      return;
    }
    this.filtroAyuda.set('');
    this.ayudaMunicipios.set(true);
    setTimeout(() => this.ayudaInput?.nativeElement.focus(), 50);
  }

  cerrarAyudaMunicipios(): void {
    this.ayudaMunicipios.set(false);
  }

  elegirMunicipio(m: Municipio): void {
    this.busquedaForm.patchValue({ municipio: m.nombre });
    this.cerrarAyudaMunicipios();
  }

  elegirPrimerMunicipio(): void {
    const primero = this.municipiosAyuda()[0];
    if (primero) this.elegirMunicipio(primero);
  }

  private resolverMunicipioBusqueda(texto: string): Municipio | null {
    const q = normalizar(texto);
    if (!q) return null;
    const lista = this.municipios();
    if (/^\d+$/.test(q)) return lista.find(m => m.id_municipio === Number(q)) ?? null;
    return lista.find(m => normalizar(m.nombre) === q) ?? null;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.ayudaMunicipios()) this.cerrarAyudaMunicipios();
  }

  private municipiosDeDistrito(nombreDistrito: string): Municipio[] {
    const n = normalizar(nombreDistrito);
    if (!n) return this.municipios();
    const d = this.distritos().find(x => normalizar(x.nombre) === n);
    return d ? this.municipios().filter(m => m.id_distrito === d.id_distrito) : this.municipios();
  }

  goHome(): void {
    this.router.navigate(['/home']);
  }

  solicitudManual(): void {
    this.router.navigate(['/defunciones/solicitud'], { state: { tiposServicio: this.tiposServicio, manual: true } });
  }

  cambiarModo(modo: 'registrales' | 'personales'): void {
    this.cerrarAyudaMunicipios();
    this.modoBusqueda.set(modo);
    this.mensajeError.set('');
  }

  limpiarBusqueda(): void {
    this.cerrarAyudaMunicipios();
    this.busquedaForm.reset({ entidad: this.entidadDefault });
    this.resultados.set([]);
    this.total.set(0);
    this.offset.set(0);
    this.busquedaHecha.set(false);
    this.mensajeError.set('');
  }

  private construirFiltros(): BusquedaDefuncion {
    const f = this.busquedaForm.value;
    const num = (v: any) => {
      const n = parseInt(`${v ?? ''}`.trim(), 10);
      return isNaN(n) ? undefined : n;
    };
    const str = (v: any) => {
      const s = `${v ?? ''}`.trim();
      return s ? s : undefined;
    };

    let filtros: BusquedaDefuncion;
    if (this.modoBusqueda() === 'registrales') {
      const mun = this.municipioElegido();
      const dis = this.distritoElegido();
      filtros = {
        estado_registro_historico_id: num(f.entidad),
        distrito_registro_historico_id: dis ? dis.id_distrito : undefined,
        distrito: !dis && str(f.distrito) ? normalizar(f.distrito) : undefined,
        municipio_registro_historico_id: mun ? mun.id_municipio : undefined,
        municipio: !mun && str(f.municipio) ? normalizar(f.municipio) : undefined,
        oficialia: num(f.oficialia),
        numero_acta_original: str(f.numeroActa),
        anio_registro: num(f.anioRegistro),
        llave: str(f.llave)?.toUpperCase(),
      };
    } else {
      filtros = {
        nombre: str(f.nombre),
        apellido_paterno: str(f.apellidoPaterno),
        apellido_materno: str(f.apellidoMaterno),
      };
    }

    Object.keys(filtros).forEach(k => {
      if ((filtros as any)[k] === undefined) delete (filtros as any)[k];
    });
    return filtros;
  }

  buscarActa(): void {
    const filtros = this.construirFiltros();
    const criterios = Object.keys(filtros).filter(k => k !== 'estado_registro_historico_id');
    if (criterios.length === 0) {
      this.mensajeError.set(
        this.modoBusqueda() === 'registrales'
          ? 'Captura al menos distrito, municipio, oficialía, número de acta, año o llave.'
          : 'Captura al menos nombre o apellido del finado.'
      );
      this.busquedaHecha.set(true);
      this.resultados.set([]);
      this.total.set(0);
      return;
    }
    this.ultimaBusqueda = filtros;
    this.consultar(0, true);
  }

  irAPagina(delta: number): void {
    const nuevo = this.offset() + delta * this.pageSize;
    if (nuevo < 0 || nuevo >= this.total()) return;
    this.consultar(nuevo, false);
  }

  private consultar(offset: number, abrirSiUnico: boolean): void {
    this.buscando.set(true);
    this.mensajeError.set('');
    this.api.buscarRegistrosDefuncion({ ...this.ultimaBusqueda, limit: this.pageSize, offset })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: resp => {
          const data = resp?.data ?? [];
          this.resultados.set(data);
          this.total.set(resp?.meta?.total ?? data.length);
          this.offset.set(resp?.meta?.offset ?? offset);
          this.busquedaHecha.set(true);
          this.buscando.set(false);
          if (abrirSiUnico && data.length === 1 && this.total() === 1) this.verDetalle(data[0]);
        },
        error: err => {
          this.buscando.set(false);
          this.busquedaHecha.set(true);
          this.resultados.set([]);
          this.total.set(0);
          this.mensajeError.set(
            err?.status === 404
              ? 'El servicio de defunciones todavía no está disponible.'
              : err?.error?.error?.message ?? 'No se pudo consultar el acervo de defunciones.'
          );
        },
      });
  }

  verDetalle(registro: RegistroDefuncion): void {
    const dialogRef = this.dialog.open(DefuncionDetalleComponent, {
      width: '1040px',
      maxWidth: '96vw',
      maxHeight: '92vh',
      panelClass: 'acta-ficha-dialog',
      autoFocus: false,
      data: { registro, puedeEditar: this.permisoEdicion(), tiposServicio: this.tiposServicio },
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((result?: RegistroDefuncion) => {
      if (result && this.permisoEdicion()) this.editarRegistro(result);
    });
  }

  private aISO(d: Date | null): string {
    if (!d) return '';
    return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`;
  }

  private permisoEdicion(): boolean {
    const permitido = this.auth.isLoggedIn() && this.auth.tieneRol(...ROLES_EDICION);
    this.puedeEditar.set(permitido);
    return permitido;
  }

  private denegarEdicion(): void {
    this.mostrarCaptura.set(false);
    this.registroId.set(null);
    this.defuncionForm.reset();
    this.avisos.aviso('No tienes permiso para crear o modificar registros de defunción. Solo Administrador y Validador pueden hacerlo.');
  }

  editarRegistro(registro: RegistroDefuncion): void {
    if (!this.permisoEdicion()) { this.denegarEdicion(); return; }
    const datos = registroDefuncionAFormulario(registro);
    this.defuncionForm.reset();
    this.defuncionForm.patchValue(
      {
        ...datos,
        fechaRegistro: this.aISO(datos.fechaRegistro),
        fechaDefuncion: this.aISO(datos.fechaDefuncion),
      },
      { emitEvent: false }
    );
    this.filtroDistrito.set(datos.distrito);
    this.originalMunicipio = { id: datos.municipioId, texto: datos.municipio };
    const reg = municipioVisible(registro.origen, registro.municipio_registro_historico_id, registro.municipio_registro_historico_texto, id => this.catMun.nombre(id));
    this.defuncionForm.patchValue({ municipio: normalizar(reg.nombre) }, { emitEvent: false });
    this.registroId.set(registro.id);
    this.abrirCaptura();
  }

  nuevoRegistro(): void {
    if (!this.permisoEdicion()) { this.denegarEdicion(); return; }
    this.originalMunicipio = { id: '', texto: '' };
    this.defuncionForm.reset();
    this.registroId.set(null);
    this.abrirCaptura();
  }

  cerrarCaptura(): void {
    this.mostrarCaptura.set(false);
    this.registroId.set(null);
    this.defuncionForm.reset();
  }

  private abrirCaptura(): void {
    this.mostrarCaptura.set(true);
    setTimeout(() => this.capturaRef?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  setSexo(valor: string): void {
    this.defuncionForm.get('sexo')?.setValue(valor);
  }

  guardarRegistro(): void {
    if (!this.permisoEdicion()) { this.denegarEdicion(); return; }
    const f = this.defuncionForm.value;
    if (!`${f.nombre ?? ''}`.trim()) {
      this.avisos.error('El nombre del finado es obligatorio.');
      return;
    }
    if (!`${f.oficialia ?? ''}`.trim() || isNaN(parseInt(f.oficialia, 10))) {
      this.avisos.error('La oficialía es obligatoria y debe ser numérica.');
      return;
    }

    const regMun = this.resolverMunicipio(f.municipioId, this.originalMunicipio);
    if (!regMun) return;

    const payload = formularioARegistroDefuncion(f);
    payload.municipio_registro_historico_texto = regMun.texto;
    const id = this.registroId();
    const peticion = id
      ? this.api.actualizarRegistroDefuncion(id, payload)
      : this.api.crearRegistroDefuncion(payload);

    this.guardando.set(true);
    peticion.pipe(takeUntil(this.destroy$)).subscribe({
      next: resp => {
        this.guardando.set(false);
        if (resp?.data) {
          this.registroId.set(resp.data.id);
          this.resultados.update(lista => lista.map(r => (r.id === resp.data.id ? resp.data : r)));
        }
        this.avisos.exito(id ? 'Registro actualizado correctamente.' : `Registro creado correctamente (ID ${resp?.data?.id}).`);
      },
      error: err => {
        this.guardando.set(false);
        if (err?.status === 401 || err?.status === 403) {
          this.denegarEdicion();
          return;
        }
        this.avisos.error(err?.error?.error?.message ?? 'No se pudo guardar el registro.');
      },
    });
  }

  private resolverMunicipio(numero: any, original: { id: string; texto: string }): { texto: string | null } | null {
    const num = `${numero ?? ''}`.trim();
    if (!num) return { texto: null };
    if (num === original.id) {
      return { texto: original.texto ? original.texto.trim().toUpperCase() : null };
    }
    const m = this.catMun.buscar(num);
    if (!m) {
      this.avisos.error(`El municipio número ${num} no existe en el catálogo de municipios.`);
      return null;
    }
    return { texto: normalizar(m.nombre) };
  }

  municipioDe(r: RegistroDefuncion): string {
    return municipioTexto(municipioVisible(
      r.origen, r.municipio_registro_historico_id, r.municipio_registro_historico_texto, id => this.catMun.nombre(id)
    )) || '—';
  }

  actaDe(r: RegistroDefuncion): string {
    return actaDefuncion(r) || '—';
  }

  nombreDe(r: RegistroDefuncion): string {
    return nombreFinado(r) || '—';
  }

  fechaDefDe(r: RegistroDefuncion): string {
    const d = fechaDefuncion(r);
    return d ? d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
  }
}