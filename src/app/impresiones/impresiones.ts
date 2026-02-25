import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../auth';
import { SolicitudDialogComponent } from '../solicitud-dialog/solicitud-dialog';

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
  selector: 'app-impresiones',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatDividerModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './impresiones.html',
  styleUrls: ['./impresiones.scss'],
})
export class ImpresionesComponent implements OnInit {

  private readonly API = '/api/v1';

  folio = '';
  buscando = false;
  error: string | null = null;

  private get headers(): HttpHeaders {
    const token = sessionStorage.getItem('token') ?? '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  constructor(
    private http: HttpClient,
    private router: Router,
    private dialog: MatDialog,
    private auth: AuthService,
    private cdr: ChangeDetectorRef,
  ) { }

  ngOnInit(): void {
    if (!this.auth.getToken()) {
      this.router.navigate(['/login']);
    }
  }

  buscar(): void {
    const f = this.folio.trim();
    if (!f) { this.error = 'Ingresa un folio'; return; }

    this.buscando = true;
    this.error = null;

    this.http.get<any>(`${this.API}/solicitudes/folio/${f}`, { headers: this.headers })
      .pipe(
        finalize(() => {
          this.buscando = false;
          this.cdr.detectChanges(); 
        })
      )
      .subscribe({
        next: (resp) => {
          if (!resp?.ok || !resp.data) {
            this.error = 'No se encontró la solicitud';
            return;
          }
          this.abrirDialog(resp.data);
        },
        error: (err) => {
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
      folio: solicitud.folio,
      oficialia: rb['oficialia'] ?? '',
      noActa: rb['acta'] ?? '',
      fechaRegistro: rb['fechaRegistro'] ?? (solicitud.fecha_recepcion?.split('T')[0] ?? ''),
      lugarRegistro: rb['lugarRegistro'] ?? [rb['localidad'], rb['municipio'], rb['distrito']].filter(Boolean).join(' '),
      nombreRegistrado: rb['nombre'] ?? '',
      lugarNacimiento: rb['lugarNacimiento'] ?? rb['municipio'] ?? '',
      edad: rb['edad'] ?? '',
      nacionalidad: rb['nacionalidad'] ?? '',
      padre: rb['padre'] ?? '',
      nacionalidadPadre: rb['nacionalidadPadre'] ?? '',
      madre: rb['madre'] ?? '',
      nacionalidadMadre: rb['nacionalidadMadre'] ?? '',
      sexo: rb['sexo'] ?? '',
      nombreContrayente2: rb['nombreContrayente2'] ?? undefined,
      lugarNacimiento2: rb['lugarNacimiento2'] ?? undefined,
      edad2: rb['edad2'] ?? undefined,
      nacionalidad2: rb['nacionalidad2'] ?? undefined,
      padre2: rb['padre2'] ?? undefined,
      nacionalidadPadre2: rb['nacionalidadPadre2'] ?? undefined,
      madre2: rb['madre2'] ?? undefined,
      nacionalidadMadre2: rb['nacionalidadMadre2'] ?? undefined,
      sexo2: rb['sexo2'] ?? undefined,
      anotaciones: rb['anotaciones'] ?? '',
      copias: rb['copiasSolicitadas'] ? Number(rb['copiasSolicitadas']) : 1,
      rawSolicitud: solicitud,
    };

    const ref = this.dialog.open(SolicitudDialogComponent, {
      data: datos,
      width: '620px',
      maxHeight: '90vh',
      panelClass: 'solicitud-panel',
      disableClose: false,
    });

    ref.afterClosed().subscribe(result => {
      this.buscando = false;
      this.error = null;
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
      next: (resp) => {
        if (resp?.ok) {
          alert(`Hoja valorada ${folioHV} ligada correctamente a ${solicitud.folio}`);
          this.folio = '';
          this.error = null;
        } else {
          alert('Error al ligar la hoja valorada');
        }
      },
      error: (err) => {
        const msg = err?.error?.error?.message ?? 'Error desconocido';
        alert('Error: ' + msg);
      }
    });
  }

  goHome(): void {
    this.router.navigate(['/home']);
  }
}