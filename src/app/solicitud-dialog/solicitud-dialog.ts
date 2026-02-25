import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { DatosSolicitud } from '../impresiones/impresiones';

@Component({
  selector: 'app-solicitud-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatInputModule,
    MatFormFieldModule,
  ],
  templateUrl: './solicitud-dialog.html',
  styleUrls: ['./solicitud-dialog.scss'],
})
export class SolicitudDialogComponent {

  ligando        = false;
  mostrarFormHV  = false;
  folioHV:       number | null = null;
  observacionesHV = '';

  constructor(
    public dialogRef: MatDialogRef<SolicitudDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public datos: DatosSolicitud,
  ) {}

  cerrar(): void {
    this.dialogRef.close();
  }

  abrirFormHV(): void {
    this.mostrarFormHV = true;
  }

  cancelarHV(): void {
    this.mostrarFormHV  = false;
    this.folioHV        = null;
    this.observacionesHV = '';
  }

  confirmarLigar(): void {
    if (!this.folioHV || this.folioHV <= 0) {
      alert('Ingresa un folio de hoja valorada válido');
      return;
    }
    this.ligando = true;
    this.dialogRef.close({
      accion:       'ligar',
      solicitud:    this.datos.rawSolicitud,
      folioHV:      this.folioHV,
      observaciones: this.observacionesHV,
    });
  }
}