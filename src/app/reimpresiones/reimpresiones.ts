import { Component, Inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { ReporteBusquedaService } from '../reporte-busqueda/reporte-busqueda';

@Component({
  selector: 'app-reimpresion-solicitudes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
  ],
  templateUrl: './reimpresiones.html',
  styleUrls: ['./reimpresiones.scss'],
})
export class ReimpresionSolicitudesComponent {

  private readonly API = '/api/v1';

  folio      = '';
  nombre     = '';
  buscando   = false;
  procesando = false;
  error: string | null = null;

  solicitud: any = null;

  private get headers(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionStorage.getItem('token') ?? ''}`,
    });
  }

  constructor(
    public  dialogRef: MatDialogRef<ReimpresionSolicitudesComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private http:    HttpClient,
    private cdr:     ChangeDetectorRef,
    private reporte: ReporteBusquedaService,
  ) {}

  buscarPorFolio(): void {
    const f = this.folio.trim();
    if (!f) { this.error = 'Ingresa un folio'; return; }

    this.buscando  = true;
    this.error     = null;
    this.solicitud = null;
    this.nombre    = '';

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
          this.mapear(resp.data);
          this.cdr.detectChanges();
        },
        error: err => {
          this.buscando = false;
          this.error    = err?.error?.error?.message ?? 'Error al buscar';
          this.cdr.detectChanges();
        },
      });
  }

  buscarPorNombre(): void {
    const n = this.nombre.trim();
    if (!n) { this.error = 'Ingresa un nombre'; return; }

    this.buscando  = true;
    this.error     = null;
    this.solicitud = null;
    this.folio     = '';

    this.http
      .get<any>(`${this.API}/solicitudes?nombre=${encodeURIComponent(n)}&limit=1`, { headers: this.headers })
      .subscribe({
        next: resp => {
          this.buscando = false;
          const lista = resp?.data ?? [];
          if (!resp?.ok || lista.length === 0) {
            this.error = 'No se encontró ninguna solicitud con ese nombre';
            this.cdr.detectChanges();
            return;
          }
          this.mapear(lista[0]);
          this.cdr.detectChanges();
        },
        error: err => {
          this.buscando = false;
          this.error    = err?.error?.error?.message ?? 'Error al buscar';
          this.cdr.detectChanges();
        },
      });
  }

  // ── Reimprimir — solo PDF, sin cambiar estados ni HV ─────
  async reimprimir(): Promise<void> {
    if (!this.solicitud || this.procesando) return;

    this.procesando = true;
    this.error      = null;

    try {
      await this.reporte.generarSoloPDF(this.solicitud.folio);
    } catch (err: any) {
      this.error = err?.message ?? 'Error al generar el PDF';
    } finally {
      this.procesando = false;
      this.cdr.detectChanges();
    }
  }

  private mapear(d: any): void {
    const rb = this.parsear(d.resultado_busqueda);

    this.solicitud = {
      folio:     d.folio,
      estado_id: d.estado_id,
      entidad:   rb['entidad']    ?? rb['claveEntidad']   ?? '',
      municipio: rb['municipio']  ?? rb['claveMunicipio'] ?? '',
      distrito:  rb['distrito']   ?? rb['claveDistrito']  ?? '',
      oficialia: rb['oficialia']  ?? rb['claveOficialia'] ?? '',
      localidad: rb['localidad']  ?? rb['claveLocalidad'] ?? '',
      fechaActa: rb['fechaActa']  ?? rb['fecha']          ?? '',
      anio:      rb['anio']       ?? rb['anioActa']       ?? '',
      foja:      rb['foja']       ?? '',
      acta:      rb['acta']       ?? rb['numeroActa']     ?? '',
      enDoc:     rb['enDoc']      ?? rb['endoc']          ?? '',
      nombre:       rb['nombre']       ?? '',
      crip:         rb['crip']         ?? rb['curp']         ?? '',
      entidadNac:   rb['entidadNac']   ?? '',
      municipioNac: rb['municipioNac'] ?? '',
      distritoNac:  rb['distritoNac']  ?? '',
      localidadNac: rb['localidadNac'] ?? '',
      padre:        rb['padre']        ?? rb['nombrePadre']  ?? '',
      madre:        rb['madre']        ?? rb['nombreMadre']  ?? '',
      servicio:          rb['servicio']          ?? '',
      dctoPresentado:    rb['dctoPresentado']    ?? rb['documentoPresentado'] ?? '',
      tipoActa:          rb['tipoActa']          ?? '',
      copiasSolicitadas: rb['copiasSolicitadas'] ?? '',
      modalidad:         rb['modalidad']         ?? '',
      aniosBusqueda:     rb['aniosBusqueda']     ?? '',
      rangoBusqueda:     rb['rangoBusqueda']     ?? '',
      fechaEntrega:      d.fecha_entrega_resultado ?? rb['fechaEntrega'] ?? '',
      horaEntrega:       rb['horaEntrega']         ?? '',
      facturaNombre: rb['facturaNombre'] ?? rb['nombreFactura'] ?? '',
      rfc:           rb['rfc']           ?? '',
      correo:        rb['correo']        ?? rb['email']         ?? '',
      cfdi:          rb['cfdi']          ?? rb['usoCFDI']       ?? '',
      regimen:       rb['regimen']       ?? rb['regimenFiscal'] ?? '',
      codigoPostal:  rb['codigoPostal']  ?? rb['cp']           ?? '',
      observaciones: rb['observaciones'] ?? '',
    };

    this.folio = d.folio ?? '';
  }

  private parsear(texto: string | null): Record<string, string> {
    if (!texto) return {};
    try { return JSON.parse(texto); } catch { return {}; }
  }

  cerrar(): void {
    this.dialogRef.close();
  }
}