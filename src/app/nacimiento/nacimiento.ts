import { Component, OnInit, OnDestroy, ElementRef, HostListener, ViewChild, WritableSignal, computed, signal } from '@angular/core';
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
import {
  ENTIDADES,
  ENTIDADES_INEGI,
  formularioARegistro,
  nombreCompleto,
  normalizar,
  registroAFormulario,
} from '../registro-nacimiento.mapper';

interface Distrito { id_distrito: number; id_region: number; nombre: string; }
interface Municipio { id_municipio: number; id_distrito: number; nombre: string; }

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

  distritos = signal<Distrito[]>([]);
  municipios = signal<Municipio[]>([]);
  filtroDistrito = signal('');
  filtroMunicipio = signal('');
  filtroDistritoNac = signal('');
  filtroMunicipioNac = signal('');

  distritosFiltrados = computed(() => this.filtrarPorNombre(this.distritos(), this.filtroDistrito()));
  distritosNacFiltrados = computed(() => this.filtrarPorNombre(this.distritos(), this.filtroDistritoNac()));
  municipiosFiltrados = computed(() =>
    this.filtrarPorNombre(this.municipiosDeDistrito(this.filtroDistrito()), this.filtroMunicipio())
  );
  municipiosNacFiltrados = computed(() =>
    this.filtrarPorNombre(this.municipiosDeDistrito(this.filtroDistritoNac()), this.filtroMunicipioNac())
  );

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
      oficialia: [''],
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

    this.busquedaForm.get('entidad')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(v => {
      this.entidadBusqueda.set(Number(v) || 0);
      if (Number(v) !== this.entidadDefault) this.cerrarAyudaMunicipios();
    });

    this.nacimientoForm = this.fb.group({
      entidad: [''],
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
    this.enlazarFiltro('municipio', this.filtroMunicipio);
    this.enlazarFiltro('distritoNacimiento', this.filtroDistritoNac);
    this.enlazarFiltro('municipioNacimiento', this.filtroMunicipioNac);
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
    this.api.getMunicipios().pipe(takeUntil(this.destroy$)).subscribe({
      next: resp => this.municipios.set(resp?.data ?? []),
      error: err => console.error('Error catálogo municipios:', err?.status),
    });
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

  cambiarModo(modo: 'registrales' | 'personales'): void {
    this.cerrarAyudaMunicipios();
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
      filtros = {
        estado_registro_historico_id: num(f.entidad),
        municipio: str(f.municipio) ? normalizar(f.municipio) : undefined,
        oficialia: num(f.oficialia),
        fecha_registro: fecha,
        anio_registro: fecha ? num(fecha.slice(0, 4)) : undefined,
        numero_acta: num(f.numeroActa),
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
          ? 'Captura al menos municipio, oficialía, fecha de registro o número de acta.'
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
    this.registroId.set(registro.id);
    this.abrirCaptura();
  }

  nuevoRegistro(): void {
    if (!this.permisoEdicion()) { this.denegarEdicion(); return; }
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

    const payload = formularioARegistro(f);
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