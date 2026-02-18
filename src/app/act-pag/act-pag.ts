import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

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
export class ConsultaPagoComponent {
  folioBuscar: string = '';
  solicitud: any = null;
  procesando: boolean = false;

  constructor(
    private router: Router,
    private apiService: ApiService
  ) { }

  goHome() {
    this.router.navigate(['/home']);
  }

  buscarFolio() {
    if (!this.folioBuscar) {
      alert('Ingrese un folio');
      return;
    }

    this.procesando = true;

    this.apiService.getSolicitudPorFolio(this.folioBuscar).subscribe({
      next: (res) => {
        const data = res.data;
        if (!data) {
          alert('Solicitud no encontrada.');
          this.solicitud = null;
          this.procesando = false;
          return;
        }

        this.solicitud = {
          id: data.id,
          aniosBusqueda: data.aniosBusqueda || '',
          solicitud: data.folio || '',
          oficialia: data.oficialia || '',
          numeroActa: data.numero_acta || '',
          numeroFoja: data.numero_foja || '',
          fechaRegistro: data.fecha_registro || '',
          lugarRegistro: data.lugar_registro || '',
          rangoBusqueda: data.rango_busqueda || '',
          estadoBiologico: data.estado_biologico || '',
          estadoActa: data.estado_acta || '',
          documentoPresentado: data.documento_presentado || '',
          nombres: data.nombre_contribuyente || '',
          crip: data.crip || '',
          sexo: data.sexo || '',
          copiasSolicitadas: data.copias_solicitadas || '',
          fechaEntregaHora: data.fecha_entrega_resultado || '',
          fechaSolicitudHora: data.fecha_recepcion || '',
          status: data.estado?.clave || data.status || '',
          lineaCaptura: '',
          tipoActa: data.tipoActa || ''
        };

        this.apiService.getPago(data.id).subscribe({
          next: pagoRes => {
            if (pagoRes?.data) {
              this.solicitud.lineaCaptura = pagoRes.data.referencia_pago || '';
              this.solicitud.status = pagoRes.data.estatus || this.solicitud.status;
            }
            this.procesando = false;
          },
          error: err => {
            console.warn('No se encontró pago para esta solicitud', err);
            this.procesando = false;
          }
        });
      },
      error: (err) => {
        console.error(err);
        alert('Solicitud no encontrada.');
        this.solicitud = null;
        this.procesando = false;
      }
    });
  }

  marcarPagado() {
    if (!this.solicitud?.id) return;

    const comentario = 'Pago registrado manualmente desde ventanilla';
    this.procesando = true;
    this.apiService.cambiarEstado(this.solicitud.id, 'PENDIENTE_PAGO', comentario).subscribe({
      next: () => {
        this.apiService.cambiarEstado(this.solicitud.id, 'PAGADA', comentario).subscribe({
          next: () => {
            alert(`Folio ${this.solicitud.solicitud} marcado como PAGADO`);
            this.solicitud.status = 'PAGADA';
            this.procesando = false;
          },
          error: (err) => {
            console.error(JSON.stringify(err.error));
            alert('Error al cambiar a PAGADA: ' + err.error?.error?.message);
            this.procesando = false;
          }
        });
      },
      error: (err) => {
        console.error(JSON.stringify(err.error));
        alert('Error al cambiar a PENDIENTE_PAGO: ' + err.error?.error?.message);
        this.procesando = false;
      }
    });
  }

  imprimirPago() {
    if (!this.solicitud?.lineaCaptura) return;
    const urlPdf = `https://impresionsiox.finanzasoaxaca.gob.mx:443/jasper/${this.solicitud.lineaCaptura}.pdf`;
    const ventana = window.open(urlPdf, '_blank', 'width=900,height=700');
    ventana?.addEventListener('load', () => ventana.print());
  }
}
