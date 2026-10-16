import { Component, Inject, OnInit, Optional, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { ApiService, RegistroReconocimiento } from '../http';
import { AuthService } from '../auth';
import { CatalogoMunicipiosService } from '../catalogo-municipios';
import { municipioTexto, municipioVisible, normalizar, sexoLabel } from '../registro-nacimiento.mapper';
import {
  actaReconocimiento,
  estadoSolicitudReconocimiento,
  fechaRegistroReconocimiento,
  nombreReconocedor,
  nombreReconocido,
} from '../registro-reconocimiento.mapper';

export interface ReconocimientoDetalleData {
  registro?: RegistroReconocimiento;
  id?: number;
  puedeEditar?: boolean;
  tiposServicio?: any[];
}

@Component({
  selector: 'app-reconocimiento-detalle',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatDialogModule, MatProgressSpinnerModule],
  templateUrl: './reconocimiento-detalle.html',
  styleUrls: ['../acta-detalle/acta-detalle.scss'],
})
export class ReconocimientoDetalleComponent implements OnInit {
  registro = signal<RegistroReconocimiento | null>(null);
  cargando = signal(false);
  error = signal('');

  constructor(
    public dialogRef: MatDialogRef<ReconocimientoDetalleComponent>,
    private router: Router,
    private api: ApiService,
    private auth: AuthService,
    private catMun: CatalogoMunicipiosService,
    @Optional() @Inject(MAT_DIALOG_DATA) private data: ReconocimientoDetalleData | null,
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
    this.api.getRegistroReconocimiento(id).subscribe({
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

  acta(r: RegistroReconocimiento): string {
    return actaReconocimiento(r);
  }

  fechaRegistro(r: RegistroReconocimiento): Date | null {
    return fechaRegistroReconocimiento(r);
  }

  reconocido(r: RegistroReconocimiento): string {
    return nombreReconocido(r);
  }

  reconocedor(r: RegistroReconocimiento): string {
    return nombreReconocedor(r);
  }

  titulo(r: RegistroReconocimiento): string {
    return nombreReconocido(r) || 'Sin nombre';
  }

  sexo(r: RegistroReconocimiento): string {
    return sexoLabel(r.sexo_reconocido);
  }

  iniciales(r: RegistroReconocimiento): string {
    const a = (r.nombre_reconocido ?? '').trim()[0] ?? '';
    const b = (r.apellido_paterno_reconocido ?? '').trim()[0] ?? '';
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
    this.router.navigate(['/reconocimientos/solicitud'], {
      state: estadoSolicitudReconocimiento(r, normalizar(mun.nombre), this.data?.tiposServicio ?? []),
    });
  }
}