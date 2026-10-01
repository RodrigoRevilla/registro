import { Component, Inject, Optional, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService, RegistroNacimiento } from '../http';
import {
  estadoVitalLabel,
  fechaLocal,
  nombreCompleto,
  sexoLabel,
} from '../registro-nacimiento.mapper';

interface ActaData {
  entidad: string;
  municipio: string;
  oficialia: string;
  distrito: string;
  anioRegistro: string;
  numeroActa: string;
  foja: string;

  entidadNacimiento: string;
  municipioNacimiento: string;
  localidad: string;
  fechaNacimiento: Date | null;
  horaNacimiento: string;

  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombreCompleto: string;
  sexo: string;
  curp: string;
  estadoVital: string;

  nombrePadre: string;
  edadPadre: number | null;
  nacionalidadPadre: string;

  nombreMadre: string;
  edadMadre: number | null;
  nacionalidadMadre: string;

  fechaRegistro: Date | null;
  origen: string;
}

export interface ActaDetalleData {
  registro?: RegistroNacimiento;
  id?: number;
}

@Component({
  selector: 'app-acta-detalle',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './acta-detalle.html',
  styleUrls: ['./acta-detalle.scss']
})
export class ActaDetalleComponent implements OnInit {
  registro = signal<RegistroNacimiento | null>(null);
  acta = signal<ActaData | null>(null);
  cargando = signal(false);
  error = signal('');

  constructor(
    @Optional() public dialogRef: MatDialogRef<ActaDetalleComponent> | null,
    private router: Router,
    private route: ActivatedRoute,
    private api: ApiService,
    @Optional() @Inject(MAT_DIALOG_DATA) private data: ActaDetalleData | null,
  ) {}

  ngOnInit(): void {
    if (this.data?.registro) {
      this.asignar(this.data.registro);
    } else if (this.data?.id) {
      this.cargar(this.data.id);
    } else if (this.route.snapshot.paramMap.get('curp')) {
      this.cargarPorCurp(this.route.snapshot.paramMap.get('curp')!);
    } else {
      this.error.set('No se recibió ningún registro para mostrar.');
    }
  }

  private cargar(id: number): void {
    this.cargando.set(true);
    this.api.getRegistroNacimiento(id).subscribe({
      next: resp => {
        this.cargando.set(false);
        if (resp?.data) this.asignar(resp.data);
        else this.error.set('Registro no encontrado.');
      },
      error: err => {
        this.cargando.set(false);
        this.error.set(err?.error?.error?.message ?? 'No se pudo cargar el registro.');
      },
    });
  }

  private cargarPorCurp(curp: string): void {
    this.cargando.set(true);
    this.api.buscarRegistrosNacimiento({ curp: curp.toUpperCase(), limit: 1 }).subscribe({
      next: resp => {
        this.cargando.set(false);
        const r = resp?.data?.[0];
        if (r) this.asignar(r);
        else this.error.set(`No existe un registro con CURP ${curp}.`);
      },
      error: err => {
        this.cargando.set(false);
        this.error.set(err?.error?.error?.message ?? 'No se pudo cargar el registro.');
      },
    });
  }

  private asignar(r: RegistroNacimiento): void {
    this.registro.set(r);
    const fechaNac = r.anio_nacimiento && r.mes_nacimiento && r.dia_nacimiento
      ? new Date(r.anio_nacimiento, r.mes_nacimiento - 1, r.dia_nacimiento)
      : null;
    const fechaReg = fechaLocal(r.fecha_registro)
      ?? (r.anio_registro && r.mes_registro && r.dia_registro
        ? new Date(r.anio_registro, r.mes_registro - 1, r.dia_registro)
        : null);

    this.acta.set({
      entidad: r.estado_registro_historico_texto ?? '',
      municipio: r.municipio_registro_historico_texto ?? '',
      oficialia: r.oficialia != null ? `${r.oficialia}` : '',
      distrito: r.distrito_registro_historico_texto ?? '',
      anioRegistro: r.anio_registro != null ? `${r.anio_registro}` : '',
      numeroActa: r.numero_acta != null ? `${r.numero_acta}` : (r.numero_acta_original ?? ''),
      foja: r.foja != null ? `${r.foja}` : '',

      entidadNacimiento: r.estado_nacimiento_historico_texto ?? '',
      municipioNacimiento: r.municipio_nacimiento_historico_texto ?? '',
      localidad: r.localidad_nacimiento_historica_texto ?? '',
      fechaNacimiento: fechaNac,
      horaNacimiento: (r.hora_nacimiento ?? '').slice(0, 5),

      nombre: r.nombre ?? '',
      apellidoPaterno: r.apellido_paterno ?? '',
      apellidoMaterno: r.apellido_materno ?? '',
      nombreCompleto: nombreCompleto(r.nombre, r.apellido_paterno, r.apellido_materno),
      sexo: r.sexo ?? '',
      curp: r.curp ?? '',
      estadoVital: estadoVitalLabel(r.estado_vital),

      nombrePadre: nombreCompleto(r.nombre_padre, r.apellido_paterno_padre, r.apellido_materno_padre),
      edadPadre: r.edad_padre,
      nacionalidadPadre: r.nacionalidad_padre_texto ?? '',

      nombreMadre: nombreCompleto(r.nombre_madre, r.apellido_paterno_madre, r.apellido_materno_madre),
      edadMadre: r.edad_madre,
      nacionalidadMadre: r.nacionalidad_madre_texto ?? '',

      fechaRegistro: fechaReg,
      origen: r.origen ?? '',
    });
  }

  esDialogo(): boolean {
    return !!this.dialogRef;
  }

  cerrar(): void {
    if (this.dialogRef) this.dialogRef.close();
    else this.router.navigate(['/nacimiento']);
  }

  usarDatos(): void {
    this.dialogRef?.close(this.registro());
  }

  generar(): void {
    const registro = this.registro();
    this.dialogRef?.close();
    this.router.navigate(['/generar'], { state: { registroNacimiento: registro } });
  }

  getSexoLabel(sexo: string): string {
    return sexoLabel(sexo);
  }

  iniciales(nombre: string): string {
    const partes = (nombre ?? '').trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return '—';
    const primera = partes[0][0] ?? '';
    const segunda = partes.length > 2 ? partes[partes.length - 2][0] : (partes[1]?.[0] ?? '');
    return `${primera}${segunda}`.toUpperCase();
  }

  valor(v: string | number | null | undefined): string {
    return v === null || v === undefined || `${v}`.trim() === '' ? '—' : `${v}`;
  }

  formatearFecha(fecha: Date | null): string {
    if (!fecha) return '—';
    return fecha.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}