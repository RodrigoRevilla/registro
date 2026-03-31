import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatDialogRef, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../auth';
import { SolicitudDialogComponent } from '../solicitud-dialog/solicitud-dialog';

const SK_FOLIO_ACTUAL = 'imp_folio_actual';
const SK_FOLIO_USADOS = 'imp_folios_usados';
const SK_BLOQUEADO    = 'imp_bloqueado';

interface Solicitud {
  id: number;
  folio: string;
  acto_registral_id: number;
  tipo_servicio_id: number;
  estado_id: number;
  fecha_recepcion: string;
  fecha_entrega_resultado: string;
  resultado_busqueda: string | null;
}

export interface DatosSolicitud {
  folio: string;
  oficialia: string;
  noActa: string;
  fechaRegistro: string;
  lugarRegistro: string;
  nombreRegistrado: string;
  lugarNacimiento: string;
  edad: string;
  nacionalidad: string;
  padre: string;
  nacionalidadPadre: string;
  madre: string;
  nacionalidadMadre: string;
  sexo: string;
  nombreContrayente2?: string;
  lugarNacimiento2?: string;
  edad2?: string;
  nacionalidad2?: string;
  padre2?: string;
  nacionalidadPadre2?: string;
  madre2?: string;
  nacionalidadMadre2?: string;
  sexo2?: string;
  anotaciones?: string;
  copias?: number;
  rawSolicitud: Solicitud;
}

@Component({
  selector: 'app-impresiones-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './impresiones.html',
  styleUrls: ['./impresiones.scss'],
})
export class ImpresionesComponent {

  private readonly API = '/api/v1';

  folio    = '';
  buscando = false;
  error: string | null = null;
  folioInput: number | null        = null;
  folioHojaValorada: number | null = null;

  private get headers(): HttpHeaders {
    const token = sessionStorage.getItem('token') ?? '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  constructor(
    public dialogRef: MatDialogRef<ImpresionesComponent>,
    private http:     HttpClient,
    private dialog:   MatDialog,
    private auth:     AuthService,
    private cdr:      ChangeDetectorRef,
  ) {
    this.restaurarDesdeSession();
  }

  private leerUsados(): Set<number> {
    try {
      const raw = sessionStorage.getItem(SK_FOLIO_USADOS);
      return raw ? new Set<number>(JSON.parse(raw)) : new Set<number>();
    } catch { return new Set<number>(); }
  }

  private leerFolioActual(): number | null {
    const raw = sessionStorage.getItem(SK_FOLIO_ACTUAL);
    const n   = raw ? parseInt(raw, 10) : NaN;
    return !isNaN(n) && n > 0 ? n : null;
  }

  private siguienteLibre(desde: number): number {
    const usados = this.leerUsados();
    while (usados.has(desde)) { desde++; }
    return desde;
  }

  private guardarFolioActual(folio: number): void {
    sessionStorage.setItem(SK_FOLIO_ACTUAL, String(folio));
    sessionStorage.setItem(SK_BLOQUEADO, '1');
    this.folioHojaValorada = folio;
    console.log(`[IMP-HV] Folio establecido: ${folio}`);
  }

  private restaurarDesdeSession(): void {
    if (sessionStorage.getItem(SK_BLOQUEADO) !== '1') return;
    const n = this.leerFolioActual();
    if (n) {
      this.folioHojaValorada = n;
      console.log(`[IMP-HV] Restaurado: folio actual = ${n}`);
    }
  }

  get siguienteFolioEsperado(): number | null {
    const actual = this.leerFolioActual();
    if (!actual) return null;
    return this.siguienteLibre(actual);
  }

  // ── Sin validación de secuencia — permite saltar folios dañados ──────────
  establecerFolioInicial(): void {
    const n = Number(this.folioInput);
    if (!n || isNaN(n) || n <= 0 || !Number.isInteger(n)) {
      this.error = 'El folio debe ser un número entero mayor a 0.';
      return;
    }

    if (this.leerUsados().has(n)) {
      this.error = `El folio ${n} ya fue usado en esta sesión.`;
      return;
    }

    this.error = null;
    this.guardarFolioActual(n);
    this.folioInput = null;
    this.cdr.detectChanges();
  }

  buscar(): void {
    const f = this.folio.trim();
    if (!f) { this.error = 'Ingresa un folio'; return; }

    this.buscando = true;
    this.error    = null;

    this.http.get<any>(`${this.API}/solicitudes/folio/${f}`, { headers: this.headers })
      .pipe(finalize(() => {
        this.buscando = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: resp => {
          if (!resp?.ok || !resp.data) {
            this.error = 'No se encontró la solicitud';
            return;
          }
          this.abrirDialog(resp.data);
        },
        error: err => {
          const code = err?.error?.error?.code;
          this.error = code === 'NO_ENCONTRADO'
            ? 'No se encontró ninguna solicitud con ese folio'
            : err?.error?.error?.message ?? 'Error al buscar';
        }
      });
  }

  private parsearResultado(texto: string | null): Record<string, string> {
    if (!texto) return {};
    try { return JSON.parse(texto); } catch { return {}; }
  }

  private abrirDialog(solicitud: Solicitud): void {
    const rb = this.parsearResultado(solicitud.resultado_busqueda);

    const datos: DatosSolicitud = {
      folio:              solicitud.folio,
      oficialia:          rb['oficialia']          ?? '',
      noActa:             rb['acta']               ?? '',
      fechaRegistro:      rb['fechaRegistro']       ?? (solicitud.fecha_recepcion?.split('T')[0] ?? ''),
      lugarRegistro:      rb['lugarRegistro']       ?? [rb['localidad'], rb['municipio'], rb['distrito']].filter(Boolean).join(' '),
      nombreRegistrado:   rb['nombre']              ?? '',
      lugarNacimiento:    rb['lugarNacimiento']     ?? rb['municipio'] ?? '',
      edad:               rb['edad']               ?? '',
      nacionalidad:       rb['nacionalidad']        ?? '',
      padre:              rb['padre']               ?? '',
      nacionalidadPadre:  rb['nacionalidadPadre']   ?? '',
      madre:              rb['madre']               ?? '',
      nacionalidadMadre:  rb['nacionalidadMadre']   ?? '',
      sexo:               rb['sexo']               ?? '',
      nombreContrayente2: rb['nombreContrayente2']  ?? undefined,
      lugarNacimiento2:   rb['lugarNacimiento2']    ?? undefined,
      edad2:              rb['edad2']               ?? undefined,
      nacionalidad2:      rb['nacionalidad2']       ?? undefined,
      padre2:             rb['padre2']              ?? undefined,
      nacionalidadPadre2: rb['nacionalidadPadre2']  ?? undefined,
      madre2:             rb['madre2']              ?? undefined,
      nacionalidadMadre2: rb['nacionalidadMadre2']  ?? undefined,
      sexo2:              rb['sexo2']               ?? undefined,
      anotaciones:        rb['anotaciones']         ?? '',
      copias:             rb['copiasSolicitadas'] ? Number(rb['copiasSolicitadas']) : 1,
      rawSolicitud:       solicitud,
    };

    this.dialogRef.close();

    const ref = this.dialog.open(SolicitudDialogComponent, {
      data: datos,
      width: '620px',
      maxHeight: '90vh',
      panelClass: 'solicitud-panel',
      disableClose: false,
    });

    ref.afterClosed().subscribe(result => {
      this.buscando = false;
      this.error    = null;
      this.cdr.detectChanges();

      if (result?.accion === 'ligar') {
        this.ligarSolicitud(result.solicitud, result.folioHV, result.observaciones);
      }
    });
  }

  private ligarSolicitud(solicitud: Solicitud, folioHV: number, observaciones: string): void {
    this.http.post<any>(
      `${this.API}/solicitudes/${solicitud.id}/hoja-valorada`,
      { folio: folioHV, observaciones: observaciones || '' },
      { headers: this.headers }
    ).subscribe({
      next: resp => {
        if (resp?.ok) {
          alert(`Hoja valorada ${folioHV} ligada correctamente a ${solicitud.folio}`);
        } else {
          alert('Error al ligar la hoja valorada');
        }
      },
      error: err => {
        const code = err?.error?.error?.code;
        const msg  = code === 'FOLIO_DUPLICADO'
          ? `El folio ${folioHV} ya está en uso. Usa uno diferente o libéralo primero desde Cancelaciones.`
          : code === 'HOJA_YA_ASIGNADA'
          ? 'Esta solicitud ya tiene una hoja valorada asignada.'
          : err?.error?.error?.message ?? 'Error desconocido';
        alert('Error: ' + msg);
      }
    });
  }

  cerrar(): void {
    this.dialogRef.close();
  }
}