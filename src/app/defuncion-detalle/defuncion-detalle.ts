import { Component, Inject, OnInit, Optional, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { ApiService, RegistroDefuncion } from '../http';
import { AuthService } from '../auth';
import { CatalogoMunicipiosService } from '../catalogo-municipios';
import { municipioTexto, municipioVisible, normalizar, sexoLabel } from '../registro-nacimiento.mapper';
import {
  actaDefuncion,
  estadoSolicitudDefuncion,
  fechaDefuncion,
  fechaRegistroDefuncion,
  nombreFinado,
} from '../registro-defuncion.mapper';

export interface DefuncionDetalleData {
  registro?: RegistroDefuncion;
  id?: number;
  puedeEditar?: boolean;
  tiposServicio?: any[];
}

@Component({
  selector: 'app-defuncion-detalle',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatDialogModule, MatProgressSpinnerModule],
  templateUrl: './defuncion-detalle.html',
  styleUrls: ['../acta-detalle/acta-detalle.scss'],
})
export class DefuncionDetalleComponent implements OnInit {
  registro = signal<RegistroDefuncion | null>(null);
  cargando = signal(false);
  error = signal('');

  constructor(
    public dialogRef: MatDialogRef<DefuncionDetalleComponent>,
    private router: Router,
    private api: ApiService,
    private auth: AuthService,
    private catMun: CatalogoMunicipiosService,
    @Optional() @Inject(MAT_DIALOG_DATA) private data: DefuncionDetalleData | null,
  ) {}

  ngOnInit(): void {
    this.catMun.cargar();
    if (this.data?.registro) {
      this.registro.set(this.data.registro);
    } else if (this.data?.id) {
      this.cargar(this.data.id);
    } else {
      this.error.set('No se recibió ningún registro para mostrar.');
    }
  }

  private cargar(id: number): void {
    this.cargando.set(true);
    this.api.getRegistroDefuncion(id).subscribe({
      next: resp => {
        this.cargando.set(false);
        if (resp?.data) this.registro.set(resp.data);
        else this.error.set('Registro no encontrado.');
      },
      error: err => {
        this.cargando.set(false);
        this.error.set(err?.error?.error?.message ?? 'No se pudo cargar el registro.');
      },
    });
  }

  puedeEditar(): boolean {
    return this.data?.puedeEditar === true && this.auth.tieneRol('ADMINISTRADOR', 'VALIDADOR');
  }

  municipio(): string {
    const r = this.registro();
    if (!r) return '—';
    return municipioTexto(municipioVisible(
      r.origen, r.municipio_registro_historico_id, r.municipio_registro_historico_texto, id => this.catMun.nombre(id)
    )) || '—';
  }

  acta(r: RegistroDefuncion): string {
    return actaDefuncion(r);
  }

  fechaRegistro(r: RegistroDefuncion): Date | null {
    return fechaRegistroDefuncion(r);
  }

  fechaDefuncion(r: RegistroDefuncion): Date | null {
    return fechaDefuncion(r);
  }

  titulo(r: RegistroDefuncion): string {
    return nombreFinado(r) || 'Sin nombre';
  }

  sexo(r: RegistroDefuncion): string {
    return sexoLabel(r.sexo);
  }

  iniciales(r: RegistroDefuncion): string {
    const a = (r.nombre ?? '').trim()[0] ?? '';
    const b = (r.apellido_paterno ?? '').trim()[0] ?? '';
    return `${a}${b}`.toUpperCase() || '—';
  }

  valor(v: string | number | null | undefined): string {
    return v === null || v === undefined || `${v}`.trim() === '' ? '—' : `${v}`;
  }

  formatearFecha(fecha: Date | null): string {
    if (!fecha) return '—';
    return fecha.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  cerrar(): void {
    this.dialogRef.close();
  }

  editar(): void {
    if (!this.puedeEditar()) return;
    this.dialogRef.close(this.registro());
  }

  generar(): void {
    const r = this.registro();
    if (!r) return;
    const mun = municipioVisible(
      r.origen, r.municipio_registro_historico_id, r.municipio_registro_historico_texto, id => this.catMun.nombre(id)
    );
    this.dialogRef.close();
    this.router.navigate(['/defunciones/solicitud'], {
      state: estadoSolicitudDefuncion(r, normalizar(mun.nombre), this.data?.tiposServicio ?? []),
    });
  }
}