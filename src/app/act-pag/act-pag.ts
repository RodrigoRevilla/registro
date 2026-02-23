import { Component, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { switchMap, throwError, of, catchError, Subject, takeUntil } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

interface Solicitud {
  id: number;
  solicitud: string;
  status: string;
  lineaCaptura: string;
  fechaEntregaHora?: string;
  fechaSolicitudHora?: string;
  aniosBusqueda?: string;
  oficialia?: string;
  numeroActa?: string;
  numeroFoja?: string;
  fechaRegistro?: string;
  lugarRegistro?: string;
  rangoBusqueda?: string;
  estadoBiologico?: string;
  estadoActa?: string;
  documentoPresentado?: string;
  nombres?: string;
  crip?: string;
  sexo?: string;
  copiasSolicitadas?: string;
  tipoActa?: string;
}

@Component({
  selector: 'app-consulta-pago',
  templateUrl: './act-pag.html',
  styleUrls: ['./act-pag.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatMenuModule,
    MatProgressSpinnerModule
  ]
})
export class ConsultaPagoComponent implements OnDestroy {

  folioBuscar: string = '';
  transiciones: any[] = [];
  solicitud$ = new BehaviorSubject<Solicitud | null>(null);
  procesando$ = new BehaviorSubject<boolean>(false);
  get solicitud() { return this.solicitud$.getValue(); }
  get procesando() { return this.procesando$.getValue(); }

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private apiService: ApiService
  ) { }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  goHome() {
    this.router.navigate(['/home']);
  }

  buscarFolio() {
    if (!this.folioBuscar.trim()) {
      alert('Ingrese un folio');
      return;
    }
    if (this.procesando) return;
    this.folioBuscar = this.folioBuscar.trim();

    this.procesando$.next(true);
    this.solicitud$.next(null);
    this.transiciones = [];

    this.apiService.getSolicitudPorFolio(this.folioBuscar).pipe(
      takeUntil(this.destroy$),
      switchMap(res => {
        if (!res?.data) return throwError(() => new Error('Solicitud no encontrada'));
        const solicitud = this.mapearSolicitud(res.data);
        this.solicitud$.next(solicitud);
        return this.apiService.getPago(solicitud.id).pipe(
          catchError(() => of({ data: null })),
          switchMap(pagoRes => {
            if (pagoRes?.data) {
              const current = this.solicitud$.getValue()!;
              this.solicitud$.next({
                ...current,
                lineaCaptura: pagoRes.data.referencia_pago || ''
              });
            }
            const id = this.solicitud$.getValue()?.id;
            if (!id) return of({ data: [] });
            return this.apiService.getTransiciones(id).pipe(
              catchError(() => of({ data: [] }))
            );
          })
        );
      })
    ).subscribe({
      next: transRes => {
        this.transiciones = (transRes as any)?.data || [];
        this.procesando$.next(false);
        const status = this.solicitud$.getValue()?.status;
        if (status && status !== 'PENDIENTE_PAGO') {
          const mensajes: Record<string, string> = {
            'PAGADA': 'Este folio ya fue pagado.',
            'PENDIENTE_ASIGNACION': 'Este folio ya fue pagado y está pendiente de asignación.',
            'ASIGNADA': 'Este folio ya fue pagado y tiene buscador asignado.',
            'CERTIFICACION_EMITIDA': 'Este folio ya fue certificado',
            'EN_BUSQUEDA': 'Este folio ya fue pagado y está en búsqueda.',
            'EN_CERTIFICACION': 'Este folio ya fue pagado y está en certificación.',
            'EN_VALIDACION': 'Este folio ya fue pagado y está en validación.',
            'VALIDADA': 'Este folio ya fue pagado y está validado.',
            'LISTA_ENTREGA': 'Este folio ya fue pagado y está listo para entrega.',
            'ENTREGADA': 'Este folio ya fue pagado y entregado.',
            'CANCELADA': 'Este folio fue cancelado.',
            'RECHAZADA': 'Este folio fue rechazado.',
            'NO_ENCONTRADA': 'Este folio fue marcado como no encontrado.',
          };
          const msg = mensajes[status];
          if (msg) alert(msg);
        }
      },
      error: err => {
        console.error('Error buscando folio:', err);
        alert(err.message || 'Error al buscar solicitud');
        this.solicitud$.next(null);
        this.procesando$.next(false);
      }
    });
  }

  private mapearSolicitud(data: any): Solicitud {
    console.log('estado_id recibido:', data.estado_id);
    const estadosMap: Record<number, string> = {
      1: 'RECIBIDA',
      2: 'PENDIENTE_PAGO',
      3: 'PAGADA',
      4: 'CERTIFICACION_EMITIDA',
      5: 'PENDIENTE_ASIGNACION',
      6: 'ASIGNADA',
      7: 'EN_BUSQUEDA',
      8: 'EN_CERTIFICACION',
      9: 'EN_VALIDACION',
      10: 'VALIDADA',
      11: 'LISTA_ENTREGA',
      12: 'ENTREGADA',
      13: 'NO_ENCONTRADA',
      14: 'RECHAZADA',
      15: 'CANCELADA'
    };

    return {
      id: data.id,
      solicitud: data.folio || '',
      status: estadosMap[data.estado_id] || 'DESCONOCIDO',
      lineaCaptura: '',
      fechaEntregaHora: data.fecha_entrega_resultado || '',
      fechaSolicitudHora: data.fecha_recepcion || '',
      aniosBusqueda: data.aniosBusqueda || '',
      oficialia: data.oficialia || '',
      numeroActa: data.numeroActa || '',
      numeroFoja: data.numeroFoja || '',
      fechaRegistro: data.fechaRegistro || '',
      lugarRegistro: data.lugarRegistro || '',
      rangoBusqueda: data.rangoBusqueda || '',
      estadoBiologico: data.estadoBiologico || '',
      estadoActa: data.estadoActa || '',
      documentoPresentado: data.documentoPresentado || '',
      nombres: data.nombres || '',
      crip: data.crip || '',
      sexo: data.sexo || '',
      copiasSolicitadas: data.copiasSolicitadas || '',
      tipoActa: data.tipoActa || ''
    };
  }

  cargarTransiciones() {
    const id = this.solicitud?.id;
    if (!id) return;
    this.apiService.getTransiciones(id).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: res => this.transiciones = res.data || [],
      error: err => console.error('Error transiciones:', err)
    });
  }

  cambiarEstado(transicion: any) {
    const id = this.solicitud?.id;
    if (!id) return;

    let comentario = '';
    if (transicion.requiere_comentario) {
      comentario = prompt('Ingrese comentario obligatorio') || '';
      if (!comentario.trim()) { alert('Comentario requerido'); return; }
    }

    this.procesando$.next(true);

    this.apiService.cambiarEstado(id, transicion.clave, comentario).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: res => {
        const current = this.solicitud$.getValue()!;
        this.solicitud$.next({ ...current, status: res.data.EstadoNuevo });
        this.procesando$.next(false);
        this.cargarTransiciones();
        alert(`Estado actualizado a ${res.data.EstadoNuevo}`);
      },
      error: err => {
        this.procesando$.next(false);
        alert(err.error?.error?.message || 'Error al cambiar estado');
      }
    });
  }

  confirmarPagoManual() {
    const solicitudId = this.solicitud?.id;
    if (!solicitudId) { alert('ID de solicitud inválido.'); return; }

    this.procesando$.next(true);

    this.apiService.confirmarPago(solicitudId).pipe(
      takeUntil(this.destroy$),
      switchMap(res => {
        console.log('Respuesta confirmarPago:', res); 
        if (!res?.data?.verificado) {
          alert(`${res?.data?.mensaje ?? 'Pago no verificado'}`);
          this.procesando$.next(false);
          return of(null);
        }
        return of(res).pipe(
          switchMap(() => this.apiService.getSolicitudPorFolio(this.folioBuscar))
        );
      })
    ).subscribe({
      next: (res) => {
        if (!res) return;
        if (res?.data) {
          const solicitudActualizada = this.mapearSolicitud(res.data);
          this.solicitud$.next({
            ...solicitudActualizada,
            lineaCaptura: this.solicitud?.lineaCaptura || ''
          });
        }
        this.cargarTransiciones();
        this.procesando$.next(false);
        alert('Pago confirmado exitosamente');
      },
      error: (err) => {
        console.error('Error confirmando pago:', err);
        let mensaje = 'Error desconocido al confirmar el pago.';
        if (err.status === 0) mensaje = 'Error de conexión';
        else if (err.status === 422) mensaje = 'ID inválido o sin pago asociado';
        else if (err.error?.message) mensaje = err.error.message;
        alert(mensaje);
        this.procesando$.next(false);
      }
    });
  }

  imprimirPago() {
    const lineaCaptura = this.solicitud?.lineaCaptura;
    if (!lineaCaptura) return;
    const urlPdf = `https://impresionsiox.finanzasoaxaca.gob.mx:443/jasper/${lineaCaptura}.pdf`;
    const ventana = window.open(urlPdf, '_blank', 'width=900,height=700');
    ventana?.addEventListener('load', () => ventana.print());
  }
}
