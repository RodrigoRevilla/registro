import { Component, Inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-entrega-doc',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
  ],
  templateUrl: './entrega-doc.html',
  styleUrls: ['./entrega-doc.scss'],
  host: {
     style: 'display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; height: 100%; overflow: hidden;'
  }
})
export class EntregaDialogComponent {

  private readonly API = '/api/v1';

  folio = '';
  buscando = false;
  procesando = false;
  error: string | null = null;

  solicitud: any = null;

  copias = 1;
  observacionesEntrega = '';

  private get headers(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionStorage.getItem('token') ?? ''}`,
    });
  }

  constructor(
    public dialogRef: MatDialogRef<EntregaDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
  ) {
    dialogRef.updateSize('720px');
    dialogRef.addPanelClass('dialog-scroll');
  }

  buscar(): void {
    const f = this.folio.trim();
    if (!f) { this.error = 'Ingresa un folio'; return; }

    this.buscando = true;
    this.error = null;
    this.solicitud = null;

    this.http
      .get<any>(`${this.API}/solicitudes/folio/${f}`, { headers: this.headers })
      .subscribe({
        next: resp => {
          this.buscando = false;
          if (!resp?.ok || !resp.data) {
            this.error = 'No se encontró la solicitud';
            this.cdr.detectChanges();
            return;
          }
          const d = resp.data;
          const rb = this.parsear(d.resultado_busqueda);

          this.solicitud = {
            id: d.id,
            folio: d.folio,
            estado_id: d.estado_id,
            status: this.mapEstado(d.estado_id),
            nombre: rb['nombre'] ?? '',
            servicio: rb['servicio'] ?? '',
            fechaSolicitud: d.fecha_recepcion ?? '',
            fechaEntrega: d.fecha_entrega_resultado ?? '',
            horaEntrega: rb['horaEntrega'] ?? '',
            fechaPago: rb['fechaPago'] ?? '',
            observaciones: '',
            hojaValorada: null,
          };

          this.copias = Number(rb['copiasSolicitadas']) || 1;
          this.cdr.detectChanges();
          this.cargarHojaValorada(d.id);
          this.cargarComentarios(d.id);
        },
        error: err => {
          this.buscando = false;
          this.error = err?.error?.error?.message ?? 'Error al buscar';
          this.cdr.detectChanges();
        },
      });
  }

  private cargarHojaValorada(solicitudId: number): void {
    this.http
      .get<any>(`${this.API}/solicitudes/${solicitudId}/hoja-valorada`, { headers: this.headers })
      .subscribe({
        next: resp => {
          if (resp?.ok && resp.data && this.solicitud) {
            this.solicitud.hojaValorada = resp.data;
          }
          this.cdr.detectChanges();
        },
        error: () => { this.cdr.detectChanges(); },
      });
  }

  private cargarComentarios(solicitudId: number): void {
    this.http
      .get<any>(`${this.API}/solicitudes/${solicitudId}/comentarios`, { headers: this.headers })
      .subscribe({
        next: resp => {
          if (resp?.ok && resp.data?.length > 0 && this.solicitud) {
            this.solicitud.observaciones = (resp.data as any[])
              .map((c: any) => c.comentario)
              .join('\n');
            this.cdr.detectChanges();
          }
        },
        error: () => { },
      });
  }

  registrarEntrega(): void {
    if (!this.solicitud || this.procesando) return;

    this.procesando = true;
    this.error = null;

    const body = {
      estado_destino_clave: 'ENTREGADA',
      comentario: this.observacionesEntrega.trim(),
    };

    this.http
      .post<any>(
        `${this.API}/solicitudes/${this.solicitud.id}/cambio-estado`,
        body,
        { headers: this.headers }
      )
      .subscribe({
        next: resp => {
          this.procesando = false;
          if (resp?.ok) {
            this.dialogRef.close({ accion: 'entregado', folio: this.folio });
          } else {
            this.error = resp?.error?.message ?? 'Error al registrar entrega';
          }
          this.cdr.detectChanges();
        },
        error: err => {
          this.procesando = false;
          this.error = err?.error?.error?.message ?? 'Error al registrar entrega';
          this.cdr.detectChanges();
        },
      });
  }

  reimprimir(): void {
    if (!this.solicitud || this.procesando) return;

    const hv = this.solicitud.hojaValorada;
    if (!hv) {
      this.error = 'Esta solicitud no tiene hoja valorada asignada';
      return;
    }

    this.procesando = true;
    this.error = null;

    this.http
      .post<any>(
        `${this.API}/solicitudes/${this.solicitud.id}/impresion`,
        { folio_hoja_valorada: String(hv.folio) },
        { headers: this.headers }
      )
      .subscribe({
        next: resp => {
          this.procesando = false;
          if (!resp?.ok) {
            this.error = resp?.error?.message ?? 'Error al registrar reimpresión';
          }
          this.cdr.detectChanges();
        },
        error: err => {
          this.procesando = false;
          this.error = err?.error?.error?.message ?? 'Error al reimprimir';
          this.cdr.detectChanges();
        },
      });
  }

  private mapEstado(estadoId: number): string {
    const map: Record<number, string> = {
      1: 'RECIBIDA', 2: 'PENDIENTE_PAGO',
      3: 'PAGADA', 4: 'PENDIENTE_ASIGNACION',
      5: 'ASIGNADA', 6: 'EN_BUSQUEDA',
      7: 'EN_CERTIFICACION', 8: 'EN_VALIDACION',
      9: 'VALIDADA', 10: 'LISTA_ENTREGA',
      11: 'ENTREGADA', 12: 'NO_ENCONTRADA',
      13: 'RECHAZADA', 14: 'CANCELADA',
      15: 'CERTIFICACION_EMITIDA',
    };
    return map[estadoId] ?? String(estadoId);
  }

  private parsear(texto: string | null): Record<string, string> {
    if (!texto) return {};
    try { return JSON.parse(texto); } catch { return {}; }
  }

  cerrar(): void {
    this.dialogRef.close();
  }
}