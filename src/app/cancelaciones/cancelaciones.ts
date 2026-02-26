import { Component, Inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../auth';

@Component({
  selector: 'app-cancelacion-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './cancelaciones.html',
  styleUrls: ['./cancelaciones.scss'],
})
export class CancelacionDialogComponent {

  private readonly API = '/api/v1';

  folio = '';
  buscando = false;
  procesando = false;
  error: string | null = null;

  solicitud: any = null;
  hojasImpresas:   { folio: string; hojaValorada: string; id: number }[] = [];
  hojasCanceladas: { folio: string; hojaValorada: string; id: number }[] = [];
  hojaSeleccionada: any = null;
  tipoCancelacion: 'PERDIDA' | 'LIBERAR' | 'CANCELAR' | null = null;

  private get headers(): HttpHeaders {
    const token = sessionStorage.getItem('token') ?? '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  constructor(
    public dialogRef: MatDialogRef<CancelacionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private http: HttpClient,
    private auth: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  cargarMock(): void {
    this.folio = 'RC-20260224-0009';
    this.solicitud = {
      id: 99,
      status: 'PAGADA',
      servicio: 'C: Certificacion de acta',
      tipoCertificacion: 'NACIMIENTO',
      copias: 2,
      nombre1: 'Juan Carlos Pérez López',
      nombre2: 'María Fernanda Soto Ruiz',
    };
    this.hojasImpresas = [
      { id: 1, folio: 'RC-20260224-0009', hojaValorada: '1042' },
      { id: 2, folio: 'RC-20260224-0009', hojaValorada: '1043' },
    ];
    this.hojasCanceladas = [
      { id: 3, folio: 'RC-20260224-0009', hojaValorada: '1038' },
    ];
  }

  buscar(): void {
    const f = this.folio.trim();
    if (!f) { this.error = 'Ingresa un folio'; return; }

    this.buscando = true;
    this.error = null;
    this.solicitud = null;
    this.hojasImpresas = [];
    this.hojasCanceladas = [];
    this.hojaSeleccionada = null;
    this.tipoCancelacion = null;

    this.http.get<any>(`${this.API}/solicitudes/folio/${f}`, { headers: this.headers })
      .pipe(
        finalize(() => {
          this.buscando = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: resp => {
          if (!resp?.ok || !resp.data) {
            this.error = 'No se encontró la solicitud';
            return;
          }
          const d = resp.data;
          const rb = this.parsear(d.resultado_busqueda);

          this.solicitud = {
            id:                d.id,
            status:            d.estado_id,
            servicio:          rb['servicio'] ?? '',
            tipoCertificacion: rb['tipoActa'] ?? '',
            copias:            rb['copiasSolicitadas'] ?? '',
            nombre1:           rb['nombre'] ?? '',
            nombre2:           rb['nombreContrayente2'] ?? '',
          };

          this.cargarHojas(d.id);
        },
        error: err => {
          this.error = err?.error?.error?.message ?? 'Error al buscar';
        }
      });
  }

  private cargarHojas(solicitudId: number): void {
    this.http.get<any>(`${this.API}/solicitudes/${solicitudId}/hojas-valoradas`, { headers: this.headers })
      .subscribe({
        next: resp => {
          const hojas: any[] = resp?.data ?? [];
          this.hojasImpresas   = hojas.filter(h => !h.cancelada).map(h => ({ id: h.id, folio: h.folio_solicitud, hojaValorada: h.folio_hv }));
          this.hojasCanceladas = hojas.filter(h =>  h.cancelada).map(h => ({ id: h.id, folio: h.folio_solicitud, hojaValorada: h.folio_hv }));
          this.cdr.detectChanges();
        },
        error: () => {}
      });
  }

  seleccionarHoja(hoja: any): void {
    this.hojaSeleccionada = this.hojaSeleccionada?.id === hoja.id ? null : hoja;
  }

  cancelarFolio(): void {
    if (!this.solicitud || !this.tipoCancelacion) return;
    if (!confirm(`¿Confirmas cancelar el folio ${this.folio} con opción "${this.tipoCancelacion}"?`)) return;

    this.procesando = true;
    this.error = null;

    const body = {
      tipo: this.tipoCancelacion,
      hoja_valorada_id: this.hojaSeleccionada?.id ?? null,
    };

    this.http.post<any>(
      `${this.API}/solicitudes/${this.solicitud.id}/cancelar`,
      body,
      { headers: this.headers }
    )
    .pipe(
      finalize(() => {
        this.procesando = false;
        this.cdr.detectChanges();
      })
    )
    .subscribe({
      next: resp => {
        if (resp?.ok) {
          this.dialogRef.close({ accion: 'cancelado', folio: this.folio });
        } else {
          this.error = resp?.error?.message ?? 'Error al cancelar';
        }
      },
      error: err => {
        this.error = err?.error?.error?.message ?? 'Error al cancelar — intenta de nuevo';
      }
    });
  }

  private parsear(texto: string | null): Record<string, string> {
    if (!texto) return {};
    try { return JSON.parse(texto); } catch { return {}; }
  }

  cerrar(): void {
    this.dialogRef.close();
  }
}