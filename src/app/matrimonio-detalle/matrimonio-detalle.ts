import { Component, Inject, OnInit, Optional, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { ApiService, RegistroMatrimonio } from '../http';
import { AuthService } from '../auth';
import { CatalogoMunicipiosService } from '../catalogo-municipios';
import { fechaLocal, municipioTexto, municipioVisible, normalizar, sexoLabel } from '../registro-nacimiento.mapper';
import {
  actaMatrimonio,
  contrayente1,
  contrayente2,
  estadoSolicitudMatrimonio,
  fechaRegistroMatrimonio,
} from '../registro-matrimonio.mapper';

export interface MatrimonioDetalleData {
  registro?: RegistroMatrimonio;
  id?: number;
  puedeEditar?: boolean;
  tiposServicio?: any[];
}

interface Contrayente {
  nombre: string;
  sexo: string;
  edad: number | null;
  fechaNacimiento: Date | null;
  nacionalidad: string;
}

@Component({
  selector: 'app-matrimonio-detalle',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatDialogModule, MatProgressSpinnerModule],
  templateUrl: './matrimonio-detalle.html',
  styleUrls: ['../acta-detalle/acta-detalle.scss'],
})
export class MatrimonioDetalleComponent implements OnInit {
  registro = signal<RegistroMatrimonio | null>(null);
  cargando = signal(false);
  error = signal('');

  constructor(
    public dialogRef: MatDialogRef<MatrimonioDetalleComponent>,
    private router: Router,
    private api: ApiService,
    private auth: AuthService,
    private catMun: CatalogoMunicipiosService,
    @Optional() @Inject(MAT_DIALOG_DATA) private data: MatrimonioDetalleData | null,
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
    this.api.getRegistroMatrimonio(id).subscribe({
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

  acta(r: RegistroMatrimonio): string {
    return actaMatrimonio(r);
  }

  fechaRegistro(r: RegistroMatrimonio): Date | null {
    return fechaRegistroMatrimonio(r);
  }

  titulo(r: RegistroMatrimonio): string {
    const a = contrayente1(r);
    const b = contrayente2(r);
    return a && b ? `${a} y ${b}` : (a || b || 'Sin contrayentes');
  }

  etiqueta(n: number): string {
    return n === 1 ? 'El contrayente' : 'La contrayente';
  }

  contrayente(r: RegistroMatrimonio, n: 1 | 2): Contrayente {
    return n === 1
      ? {
          nombre: contrayente1(r),
          sexo: sexoLabel(r.sexo_contrayente1),
          edad: r.edad_contrayente1,
          fechaNacimiento: fechaLocal(r.fecha_nacimiento_contrayente1),
          nacionalidad: r.nacionalidad_contrayente1_texto ?? '',
        }
      : {
          nombre: contrayente2(r),
          sexo: sexoLabel(r.sexo_contrayente2),
          edad: r.edad_contrayente2,
          fechaNacimiento: fechaLocal(r.fecha_nacimiento_contrayente2),
          nacionalidad: r.nacionalidad_contrayente2_texto ?? '',
        };
  }

  iniciales(r: RegistroMatrimonio): string {
    const a = (r.nombre_contrayente1 ?? '').trim()[0] ?? '';
    const b = (r.nombre_contrayente2 ?? '').trim()[0] ?? '';
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
    this.router.navigate(['/matrimonios/solicitud'], {
      state: estadoSolicitudMatrimonio(r, normalizar(mun.nombre), this.data?.tiposServicio ?? []),
    });
  }
}