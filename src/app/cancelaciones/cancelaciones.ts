import { Component, Inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
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

  folio      = '';
  buscando   = false;
  procesando = false;
  error: string | null = null;

  solicitud:       any = null;
  hojasImpresas:   { folio: string; hojaValorada: string; id: number }[] = [];
  hojasCanceladas: { folio: string; hojaValorada: string; id: number }[] = [];
  hojaSeleccionada: any = null;
  tipoCancelacion: 'PERDIDA' | 'LIBERAR' | 'CANCELAR' | null = null;

  private get headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${sessionStorage.getItem('token') ?? ''}` });
  }

  constructor(
    public dialogRef: MatDialogRef<CancelacionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private http: HttpClient,
    private auth: AuthService,
    private cdr:  ChangeDetectorRef,
  ) {}

  buscar(): void {
    const f = this.folio.trim();
    if (!f) { this.error = 'Ingresa un folio'; return; }

    this.buscando         = true;
    this.error            = null;
    this.solicitud        = null;
    this.hojasImpresas    = [];
    this.hojasCanceladas  = [];
    this.hojaSeleccionada = null;
    this.tipoCancelacion  = null;

    this.http.get<any>(`${this.API}/solicitudes/folio/${f}`, { headers: this.headers })
      .subscribe({
        next: resp => {
          this.buscando = false;
          if (!resp?.ok || !resp.data) {
            this.error = 'No se encontró la solicitud';
            this.cdr.detectChanges();
            return;
          }
          const d  = resp.data;
          const rb = this.parsear(d.resultado_busqueda);

          this.solicitud = {
            id:                d.id,
            folio:             d.folio,
            status:            this.mapEstado(d.estado_id),
            servicio:          rb['servicio']           ?? '',
            tipoCertificacion: rb['tipoActa']           ?? '',
            copias:            rb['copiasSolicitadas']  ?? '',
            nombre1:           rb['nombre']             ?? '',
            nombre2:           rb['nombreContrayente2'] ?? '',
          };

          this.cdr.detectChanges();
          this.cargarHojas(d.id);
        },
        error: err => {
          this.buscando = false;
          this.error    = err?.error?.error?.message ?? 'Error al buscar';
          this.cdr.detectChanges();
        }
      });
  }

  private cargarHojas(solicitudId: number): void {
    this.http.get<any>(`${this.API}/solicitudes/${solicitudId}/hoja-valorada`, { headers: this.headers })
      .subscribe({
        next: resp => {
          if (!resp?.ok || !resp.data) { this.cdr.detectChanges(); return; }
          const h     = resp.data;
          const entry = { id: h.id, folio: this.folio, hojaValorada: String(h.folio) };
          if (h.estado === 'ANULADA' || h.estado === 'LIBERADA') {
            this.hojasCanceladas = [entry];
          } else {
            this.hojasImpresas = [entry];
          }
          this.cdr.detectChanges();
        },
        error: () => {
          this.cdr.detectChanges();
        }
      });
  }

  private mapEstado(estadoId: number): string {
    const map: Record<number, string> = {
      1:  'RECIBIDA',             2:  'PENDIENTE_PAGO',
      3:  'PAGADA',               4:  'PENDIENTE_ASIGNACION',
      5:  'ASIGNADA',             6:  'EN_BUSQUEDA',
      7:  'EN_CERTIFICACION',     8:  'EN_VALIDACION',
      9:  'VALIDADA',             10: 'LISTA_ENTREGA',
      11: 'ENTREGADA',            12: 'NO_ENCONTRADA',
      13: 'RECHAZADA',            14: 'CANCELADA',
      15: 'CERTIFICACION_EMITIDA',
    };
    return map[estadoId] ?? String(estadoId);
  }

  seleccionarHoja(hoja: any): void {
    this.hojaSeleccionada = this.hojaSeleccionada?.id === hoja.id ? null : hoja;
  }

  cancelarFolio(): void {
    if (!this.solicitud || !this.tipoCancelacion) return;
    if (this.tipoCancelacion !== 'LIBERAR' && !this.hojaSeleccionada) {
      this.error = 'Selecciona una hoja valorada de la tabla para continuar';
      return;
    }

    if (!confirm(`¿Confirmas la operación "${this.tipoCancelacion}" para el folio ${this.folio}?`)) return;

    this.procesando = true;
    this.error      = null;

    const folioSolicitud = this.solicitud.folio; 

    switch (this.tipoCancelacion) {

      case 'PERDIDA':
        this.http.post<any>(
          `${this.API}/solicitudes/${folioSolicitud}/hoja-valorada/anular`,
          { motivo: 'Hoja valorada perdida — necesita reimpresión en hoja nueva' },
          { headers: this.headers }
        ).subscribe({
          next: resp => {
            this.procesando = false;
            this.cdr.detectChanges();
            if (resp?.ok) {
              this.dialogRef.close({ accion: 'cancelado', tipo: 'PERDIDA', folio: this.folio });
            } else {
              this.error = 'Error al anular la hoja valorada';
            }
          },
          error: err => {
            this.procesando = false;
            this.error      = err?.error?.error?.message ?? 'Error al anular la hoja valorada';
            this.cdr.detectChanges();
          }
        });
        break;

      case 'LIBERAR':
        this.http.post<any>(
          `${this.API}/solicitudes/${folioSolicitud}/hoja-valorada/liberar`,
          {},
          { headers: this.headers }
        ).subscribe({
          next: resp => {
            this.procesando = false;
            this.cdr.detectChanges();
            if (resp?.ok) {
              this.dialogRef.close({ accion: 'cancelado', tipo: 'LIBERAR', folio: this.folio });
            } else {
              this.error = 'Error al liberar la hoja valorada';
            }
          },
          error: err => {
            this.procesando = false;
            this.error      = err?.error?.error?.message ?? 'Error al liberar la hoja valorada';
            this.cdr.detectChanges();
          }
        });
        break;

      case 'CANCELAR':
        this.http.post<any>(
          `${this.API}/solicitudes/${folioSolicitud}/hoja-valorada/anular`,
          { motivo: 'Cancelación de hoja valorada — folio no se puede reimprimir' },
          { headers: this.headers }
        ).subscribe({
          next: resp => {
            this.procesando = false;
            this.cdr.detectChanges();
            if (resp?.ok) {
              this.dialogRef.close({ accion: 'cancelado', tipo: 'CANCELAR', folio: this.folio });
            } else {
              this.error = 'Error al cancelar la hoja valorada';
            }
          },
          error: err => {
            this.procesando = false;
            this.error      = err?.error?.error?.message ?? 'Error al cancelar la hoja valorada';
            this.cdr.detectChanges();
          }
        });
        break;
    }
  }

  private parsear(texto: string | null): Record<string, string> {
    if (!texto) return {};
    try { return JSON.parse(texto); } catch { return {}; }
  }

  cerrar(): void {
    this.dialogRef.close();
  }
}