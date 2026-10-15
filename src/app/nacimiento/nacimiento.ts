import { Component, OnInit, OnDestroy, ElementRef, HostListener, ViewChild, WritableSignal, computed, effect, inject, signal, untracked } from '@angular/core';
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
import { ActaDetalleComponent } from '../acta-detalle/acta-detalle';
import { ApiService, BusquedaNacimiento, RegistroNacimiento } from '../http';
import { AuthService } from '../auth';
import { CatalogoMunicipiosService } from '../catalogo-municipios';
import {
  ENTIDADES,
  ENTIDADES_INEGI,
  formularioARegistro,
  municipioTexto,
  municipioVisible,
  nombreCompleto,
  normalizar,
  registroAFormulario,
} from '../registro-nacimiento.mapper';

interface Distrito { id_distrito: number; id_region: number; nombre: string; }
interface Municipio { id_municipio: number; id_distrito: number; nombre: string; }
interface Localidad { clave_edo: number; clave_mun: number; clave_local: number; descripcion: string; }

@Component({
  selector: 'app-nacimiento',
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
  templateUrl: './nacimiento.html',
  styleUrls: ['./nacimiento.scss'],
  host: {
    style: 'display: flex; flex-direction: column; height: 100%; overflow: hidden; min-height: 0;'
  }
})
export class NacimientoComponent implements OnInit, OnDestroy {

  @ViewChild('capturaRef') capturaRef?: ElementRef<HTMLElement>;
  @ViewChild('ayudaInput') ayudaInput?: ElementRef<HTMLInputElement>;
  @ViewChild('ayudaLocInput') ayudaLocInput?: ElementRef<HTMLInputElement>;

  busquedaForm: FormGroup;
  nacimientoForm: FormGroup;
  entidades = ENTIDADES;
  entidadesInegi = ENTIDADES_INEGI;

  readonly entidadDefault = 20;

  modoBusqueda = signal<'registrales' | 'personales'>('personales');
  incluirPadre = signal(false);
  incluirMadre = signal(false);
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

  municipioElegido = computed(() =>
    this.entidadBusqueda() === this.entidadDefault ? this.resolverMunicipioBusqueda(this.filtroMunicipioBusqueda()) : null
  );
  localidades = signal<Localidad[]>([]);
  cargandoLocalidades = signal(false);
  filtroLocalidadBusqueda = signal('');
  localidadesBusqueda = computed(() => this.filtrarLocalidades(this.filtroLocalidadBusqueda()).slice(0, 50));
  ayudaLocalidades = signal(false);
  filtroAyudaLoc = signal('');
  localidadesAyuda = computed(() => this.filtrarLocalidades(this.filtroAyudaLoc()));
  private municipioLocalidades: number | null = null;

  readonly pageSize = 20;

  resultados = signal<RegistroNacimiento[]>([]);
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

  distritos = signal<Distrito[]>([]);
  municipios = this.catMun.lista;
  filtroDistrito = signal('');
  filtroMunicipio = signal('');
  filtroDistritoNac = signal('');
  filtroMunicipioNac = signal('');

  distritosFiltrados = computed(() => this.filtrarPorNombre(this.distritos(), this.filtroDistrito()));
  distritosNacFiltrados = computed(() => this.filtrarPorNombre(this.distritos(), this.filtroDistritoNac()));
  municipiosFiltrados = computed(() =>
    this.filtrarPorNumeroONombre(this.municipiosDeDistrito(this.filtroDistrito()), this.filtroMunicipio())
  );
  municipiosNacFiltrados = computed(() =>
    this.filtrarPorNumeroONombre(this.municipiosDeDistrito(this.filtroDistritoNac()), this.filtroMunicipioNac())
  );

  private originalMunicipio = { id: '', texto: '' };
  private originalMunicipioNac = { id: '', texto: '' };

  readonly puedeEditar = signal(false);

  private ultimaBusqueda: BusquedaNacimiento = {};
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
      municipio: [''],
      localidad: [''],
      oficialia: [''],
      anioRegistro: [''],
      fechaRegistro: [''],
      numeroActa: [''],
      nombre: [''],
      apellidoPaterno: [''],
      apellidoMaterno: [''],
      fechaNacimiento: [''],
      nombrePadre: [''],
      apellidoPaternoPadre: [''],
      apellidoMaternoPadre: [''],
      nombreMadre: [''],
      apellidoPaternoMadre: [''],
      apellidoMaternoMadre: [''],
    });

    this.busquedaForm.get('municipio')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(v => {
      this.filtroMunicipioBusqueda.set(typeof v === 'string' ? v : '');
    });

    effect(() => {
      this.municipioElegido();
      untracked(() => this.actualizarLocalidades());
    });

    this.busquedaForm.get('localidad')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(v => {
      this.filtroLocalidadBusqueda.set(typeof v === 'string' ? v : '');
    });

    this.busquedaForm.get('fechaRegistro')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((fecha: string) => {
      const anio = /^(\d{4})-/.exec(fecha ?? '')?.[1];
      if (anio) this.busquedaForm.patchValue({ anioRegistro: anio }, { emitEvent: false });
    });

    this.busquedaForm.get('entidad')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(v => {
      this.entidadBusqueda.set(Number(v) || 0);
      if (Number(v) !== this.entidadDefault) {
        this.cerrarAyudaMunicipios();
        this.cerrarAyudaLocalidades();
      }
    });

    this.nacimientoForm = this.fb.group({
      entidad: [''],
      municipioId: [''],
      municipio: [''],
      oficialia: [''],
      distrito: [''],
      fechaRegistro: [''],
      anioRegistro: [''],
      foja: [''],
      numeroActa: [''],
      curp: [''],
      curp_regciv: [''],
      entidadNacimiento: [''],
      municipioNacimientoId: [''],
      municipioNacimiento: [''],
      distritoNacimiento: [''],
      localidad: [''],
      localidadNacimiento: [''],
      fechaNacimiento: [''],
      horaNacimiento: [''],
      nombre: [''],
      apellidoPaterno: [''],
      apellidoMaterno: [''],
      sexo: [''],
      libro: [''],
      status: [''],
      nombrePadre: [''],
      apellidoPaternoPadre: [''],
      apellidoMaternoPadre: [''],
      edadPadre: [''],
      nacionalidadPadre: [''],
      nombreMadre: [''],
      apellidoPaternoMadre: [''],
      apellidoMaternoMadre: [''],
      edadMadre: [''],
      nacionalidadMadre: [''],
    });

    this.aMayusculas(this.nacimientoForm, 'curp');
    this.aMayusculas(this.nacimientoForm, 'curp_regciv');

    this.nacimientoForm.get('fechaRegistro')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((fecha: string) => {
      const anio = /^(\d{4})-/.exec(fecha ?? '')?.[1];
      if (anio) this.nacimientoForm.patchValue({ anioRegistro: anio }, { emitEvent: false });
    });

    this.enlazarFiltro('distrito', this.filtroDistrito);
    this.enlazarFiltro('municipioId', this.filtroMunicipio);
    this.enlazarFiltro('distritoNacimiento', this.filtroDistritoNac);
    this.enlazarFiltro('municipioNacimientoId', this.filtroMunicipioNac);

    this.sincronizarMunicipio('municipioId', 'municipio');
    this.sincronizarMunicipio('municipioNacimientoId', 'municipioNacimiento');
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
    this.nacimientoForm.get(control)?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(v => {
      destino.set(typeof v === 'string' ? v : '');
    });
  }

  private cargarCatalogos(): void {
    this.api.getDistritos().pipe(takeUntil(this.destroy$)).subscribe({
      next: resp => this.distritos.set(resp?.data ?? []),
      error: err => console.error('Error catálogo distritos:', err?.status),
    });
    this.catMun.cargar();
  }

  private sincronizarMunicipio(controlNumero: string, controlTexto: string): void {
    this.nacimientoForm.get(controlNumero)?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(v => {
      const limpio = `${v ?? ''}`.replace(/\D/g, '');
      if (limpio !== `${v ?? ''}`) {
        this.nacimientoForm.get(controlNumero)?.setValue(limpio, { emitEvent: false });
      }
      const m = this.catMun.buscar(limpio);
      this.nacimientoForm.get(controlTexto)?.setValue(m ? normalizar(m.nombre) : '', { emitEvent: false });
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

  municipioDe(r: RegistroNacimiento): string {
    return municipioTexto(municipioVisible(
      r.origen, r.municipio_registro_historico_id, r.municipio_registro_historico_texto, id => this.catMun.nombre(id)
    )) || '—';
  }

  private filtrarPorNombre<T extends { nombre: string }>(lista: T[], texto: string): T[] {
    const n = normalizar(texto);
    const res = n ? lista.filter(x => normalizar(x.nombre).includes(n)) : lista;
    return res.slice(0, 50);
  }

  private filtrarMunicipios(texto: string): Municipio[] {
    const lista = [...this.municipios()].sort((a, b) => a.id_municipio - b.id_municipio);
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
    this.cerrarAyudaLocalidades();
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

  private actualizarLocalidades(): void {
    const m = this.municipioElegido();
    const id = m?.id_municipio ?? null;
    if (id === this.municipioLocalidades) return;
    if (this.municipioLocalidades !== null) this.busquedaForm.patchValue({ localidad: '' });
    this.municipioLocalidades = id;
    this.localidades.set([]);
    this.cerrarAyudaLocalidades();
    if (id !== null) this.cargarLocalidades(id, 0, []);
  }

  private cargarLocalidades(idMunicipio: number, offset: number, acumulado: Localidad[]): void {
    this.cargandoLocalidades.set(true);
    this.api.getLocalidades({ clave_edo: this.entidadDefault, clave_mun: idMunicipio, limit: 100, offset })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: resp => {
          if (this.municipioLocalidades !== idMunicipio) return;
          const data: Localidad[] = (resp?.data ?? []).map((l: Localidad) => this.completarLocalidad(l));
          const lista = acumulado.concat(data);
          const total = resp?.meta?.total ?? lista.length;
          if (data.length && lista.length < total) {
            this.localidades.set(lista);
            this.cargarLocalidades(idMunicipio, offset + data.length, lista);
            return;
          }
          this.localidades.set(lista);
          this.cargandoLocalidades.set(false);
        },
        error: err => {
          this.cargandoLocalidades.set(false);
          console.error('Error catálogo localidades:', err?.status);
        },
      });
  }

  private completarLocalidad(l: Localidad): Localidad {
    const nombre = `${l.descripcion ?? ''}`.trim();
    if (nombre) return { ...l, descripcion: nombre };
    const cabecera = Number(l.clave_local) === 1 ? `${this.municipioElegido()?.nombre ?? ''}`.trim().toUpperCase() : '';
    return { ...l, descripcion: cabecera || `LOCALIDAD ${this.numeroLocalidad(l)}` };
  }

  private filtrarLocalidades(texto: string): Localidad[] {
    const lista = [...this.localidades()].sort((a, b) => a.clave_local - b.clave_local);
    const q = normalizar(texto);
    if (!q) return lista;
    if (/^\d+$/.test(q)) {
      return lista.filter(l => this.numeroLocalidad(l).startsWith(q) || `${l.clave_local}`.startsWith(q));
    }
    return lista.filter(l => normalizar(l.descripcion).includes(q));
  }

  numeroLocalidad(l: Localidad): string {
    return `${l.clave_local}`.padStart(4, '0');
  }

  abrirAyudaLocalidades(): void {
    if (this.ayudaLocalidades()) {
      this.cerrarAyudaLocalidades();
      return;
    }
    this.cerrarAyudaMunicipios();
    this.filtroAyudaLoc.set('');
    this.ayudaLocalidades.set(true);
    setTimeout(() => this.ayudaLocInput?.nativeElement.focus(), 50);
  }

  cerrarAyudaLocalidades(): void {
    this.ayudaLocalidades.set(false);
  }

  elegirLocalidad(l: Localidad): void {
    this.busquedaForm.patchValue({ localidad: l.descripcion });
    this.cerrarAyudaLocalidades();
  }

  elegirPrimeraLocalidad(): void {
    const primera = this.localidadesAyuda()[0];
    if (primera) this.elegirLocalidad(primera);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.ayudaMunicipios()) this.cerrarAyudaMunicipios();
    if (this.ayudaLocalidades()) this.cerrarAyudaLocalidades();
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

  cambiarModo(modo: 'registrales' | 'personales'): void {
    this.cerrarAyudaMunicipios();
    this.cerrarAyudaLocalidades();
    this.modoBusqueda.set(modo);
    this.mensajeError.set('');
  }

  togglePadre(): void {
    this.incluirPadre.update(v => !v);
    if (!this.incluirPadre()) {
      this.busquedaForm.patchValue({ nombrePadre: '', apellidoPaternoPadre: '', apellidoMaternoPadre: '' });
    }
  }

  toggleMadre(): void {
    this.incluirMadre.update(v => !v);
    if (!this.incluirMadre()) {
      this.busquedaForm.patchValue({ nombreMadre: '', apellidoPaternoMadre: '', apellidoMaternoMadre: '' });
    }
  }

  limpiarBusqueda(): void {
    this.cerrarAyudaMunicipios();
    this.cerrarAyudaLocalidades();
    this.busquedaForm.reset({ entidad: this.entidadDefault });
    this.incluirPadre.set(false);
    this.incluirMadre.set(false);
    this.resultados.set([]);
    this.total.set(0);
    this.offset.set(0);
    this.busquedaHecha.set(false);
    this.mensajeError.set('');
  }

  private construirFiltros(): BusquedaNacimiento {
    const f = this.busquedaForm.value;
    const num = (v: any) => {
      const n = parseInt(`${v ?? ''}`.trim(), 10);
      return isNaN(n) ? undefined : n;
    };
    const str = (v: any) => {
      const s = `${v ?? ''}`.trim();
      return s ? s : undefined;
    };

    let filtros: BusquedaNacimiento;
    if (this.modoBusqueda() === 'registrales') {
      const fecha = str(f.fechaRegistro);
      const mun = this.municipioElegido();
      filtros = {
        estado_registro_historico_id: num(f.entidad),
        municipio_registro_historico_id: mun ? mun.id_municipio : undefined,
        municipio: !mun && str(f.municipio) ? normalizar(f.municipio) : undefined,
        localidad: str(f.localidad) ? normalizar(f.localidad) : undefined,
        oficialia: num(f.oficialia),
        fecha_registro: fecha,
        anio_registro: num(f.anioRegistro) ?? (fecha ? num(fecha.slice(0, 4)) : undefined),
        numero_acta_original: str(f.numeroActa),
      };
    } else {
      filtros = {
        nombre: str(f.nombre),
        apellido_paterno: str(f.apellidoPaterno),
        apellido_materno: str(f.apellidoMaterno),
        fecha_nacimiento: str(f.fechaNacimiento),
        nombre_padre: this.incluirPadre() ? str(f.nombrePadre) : undefined,
        apellido_paterno_padre: this.incluirPadre() ? str(f.apellidoPaternoPadre) : undefined,
        apellido_materno_padre: this.incluirPadre() ? str(f.apellidoMaternoPadre) : undefined,
        nombre_madre: this.incluirMadre() ? str(f.nombreMadre) : undefined,
        apellido_paterno_madre: this.incluirMadre() ? str(f.apellidoPaternoMadre) : undefined,
        apellido_materno_madre: this.incluirMadre() ? str(f.apellidoMaternoMadre) : undefined,
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
          ? 'Captura al menos municipio, localidad, oficialía, año, fecha de registro o número de acta.'
          : 'Captura al menos nombre, apellido o fecha de nacimiento del registrado, o datos del padre o la madre.'
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
    this.api.buscarRegistrosNacimiento({ ...this.ultimaBusqueda, limit: this.pageSize, offset })
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
          this.mensajeError.set(err?.error?.error?.message ?? 'No se pudo consultar el acervo de nacimientos.');
        },
      });
  }

  verDetalle(registro: RegistroNacimiento): void {
    const dialogRef = this.dialog.open(ActaDetalleComponent, {
      width: '1040px',
      maxWidth: '96vw',
      maxHeight: '92vh',
      panelClass: 'acta-ficha-dialog',
      autoFocus: false,
      data: { registro, puedeEditar: this.permisoEdicion() },
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((result?: RegistroNacimiento) => {
      if (result && this.permisoEdicion()) this.editarRegistro(result);
    });
  }

  private aISO(d: Date | null): string {
    if (!d) return '';
    return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`;
  }

  private permisoEdicion(): boolean {
    const permitido = this.auth.puedeEditarNacimientos();
    this.puedeEditar.set(permitido);
    return permitido;
  }

  private denegarEdicion(): void {
    this.mostrarCaptura.set(false);
    this.registroId.set(null);
    this.nacimientoForm.reset();
    alert('No tienes permiso para crear o modificar registros de nacimiento. Solo Administrador y Validador pueden hacerlo.');
  }

  editarRegistro(registro: RegistroNacimiento): void {
    if (!this.permisoEdicion()) { this.denegarEdicion(); return; }
    const datos = registroAFormulario(registro);
    this.nacimientoForm.reset();
    this.nacimientoForm.patchValue(
      { ...datos, fechaRegistro: this.aISO(datos.fechaRegistro), fechaNacimiento: this.aISO(datos.fechaNacimiento) },
      { emitEvent: false }
    );
    this.filtroDistrito.set(datos.distrito);
    this.filtroDistritoNac.set(datos.distritoNacimiento);
    this.originalMunicipio = { id: datos.municipioId, texto: datos.municipio };
    this.originalMunicipioNac = { id: datos.municipioNacimientoId, texto: datos.municipioNacimiento };
    const reg = municipioVisible(registro.origen, registro.municipio_registro_historico_id, registro.municipio_registro_historico_texto, id => this.catMun.nombre(id));
    const nac = municipioVisible(registro.origen, registro.municipio_nacimiento_historico_id, registro.municipio_nacimiento_historico_texto, id => this.catMun.nombre(id));
    this.nacimientoForm.patchValue(
      { municipio: normalizar(reg.nombre), municipioNacimiento: normalizar(nac.nombre) },
      { emitEvent: false }
    );
    this.registroId.set(registro.id);
    this.abrirCaptura();
  }

  nuevoRegistro(): void {
    if (!this.permisoEdicion()) { this.denegarEdicion(); return; }
    this.originalMunicipio = { id: '', texto: '' };
    this.originalMunicipioNac = { id: '', texto: '' };
    this.nacimientoForm.reset();
    this.registroId.set(null);
    this.abrirCaptura();
  }

  cerrarCaptura(): void {
    this.mostrarCaptura.set(false);
    this.registroId.set(null);
    this.nacimientoForm.reset();
  }

  private abrirCaptura(): void {
    this.mostrarCaptura.set(true);
    setTimeout(() => this.capturaRef?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  setSexo(valor: string): void {
    this.nacimientoForm.get('sexo')?.setValue(valor);
  }

  guardarRegistro(): void {
    if (!this.permisoEdicion()) { this.denegarEdicion(); return; }
    const f = this.nacimientoForm.value;
    if (!`${f.nombre ?? ''}`.trim()) {
      alert('El nombre del registrado es obligatorio.');
      return;
    }
    if (!`${f.oficialia ?? ''}`.trim() || isNaN(parseInt(f.oficialia, 10))) {
      alert('La oficialía es obligatoria y debe ser numérica.');
      return;
    }

    const regMun = this.resolverMunicipio(f.municipioId, this.originalMunicipio, 'de registro');
    if (!regMun) return;
    const nacMun = this.resolverMunicipio(f.municipioNacimientoId, this.originalMunicipioNac, 'de nacimiento');
    if (!nacMun) return;

    const payload = formularioARegistro(f);
    payload.municipio_registro_historico_texto = regMun.texto;
    payload.municipio_nacimiento_historico_texto = nacMun.texto;
    const id = this.registroId();
    const peticion = id
      ? this.api.actualizarRegistroNacimiento(id, payload)
      : this.api.crearRegistroNacimiento(payload);

    this.guardando.set(true);
    peticion.pipe(takeUntil(this.destroy$)).subscribe({
      next: resp => {
        this.guardando.set(false);
        if (resp?.data) {
          this.registroId.set(resp.data.id);
          this.resultados.update(lista => lista.map(r => (r.id === resp.data.id ? resp.data : r)));
        }
        alert(id ? 'Registro actualizado correctamente.' : `Registro creado correctamente (ID ${resp?.data?.id}).`);
      },
      error: err => {
        this.guardando.set(false);
        if (err?.status === 401 || err?.status === 403) {
          this.denegarEdicion();
          return;
        }
        alert(err?.error?.error?.message ?? 'No se pudo guardar el registro.');
      },
    });
  }

  private resolverMunicipio(
    numero: any,
    original: { id: string; texto: string },
    etiqueta: string,
  ): { texto: string | null } | null {
    const num = `${numero ?? ''}`.trim();
    if (!num) return { texto: null };
    if (num === original.id) {
      return { texto: original.texto ? original.texto.trim().toUpperCase() : null };
    }
    const m = this.catMun.buscar(num);
    if (!m) {
      alert(`El municipio ${etiqueta} número ${num} no existe en el catálogo de municipios.`);
      return null;
    }
    return { texto: normalizar(m.nombre) };
  }

  nombreDe(r: RegistroNacimiento): string {
    return nombreCompleto(r.nombre, r.apellido_paterno, r.apellido_materno);
  }

  fechaNacDe(r: RegistroNacimiento): string {
    if (!r.anio_nacimiento) return '—';
    const d = r.dia_nacimiento ? `${r.dia_nacimiento}`.padStart(2, '0') : '--';
    const m = r.mes_nacimiento ? `${r.mes_nacimiento}`.padStart(2, '0') : '--';
    return `${d}/${m}/${r.anio_nacimiento}`;
  }
}