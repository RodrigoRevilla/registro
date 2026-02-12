import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { Router } from '@angular/router';

interface ActaData {
  entidad: string;
  municipio: string;
  oficialia: string;
  distrito: string;
  anioRegistro: number;
  numeroActa: string;
  foja: string;
  
  entidadNacimiento: string;
  municipioNacimiento: string;
  localidad: string;
  fechaNacimiento: string;
  horaNacimiento: string;

  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombreCompleto: string;
  sexo: string;
  curp: string;
  estadoVital: string;
  
  nombrePadre: string;
  edadPadre: number;
  nacionalidadPadre: string;
  
  nombreMadre: string;
  edadMadre: number;
  nacionalidadMadre: string;
  
  estado: string;
  fechaRegistro: string;
}

@Component({
  selector: 'app-acta-detalle',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatDialogModule,
    MatChipsModule
  ],
  templateUrl: './acta-detalle.html',
  styleUrls: ['./acta-detalle.scss']
})
export class ActaDetalleComponent {
  actaData: ActaData = {
    entidad: 'Oaxaca',
    municipio: 'Oaxaca de Juárez',
    oficialia: '01',
    distrito: 'Centro',
    anioRegistro: 1995,
    numeroActa: '00234',
    foja: '145',
    
    entidadNacimiento: 'Oaxaca',
    municipioNacimiento: 'Oaxaca de Juárez',
    localidad: 'Centro',
    fechaNacimiento: '1995-03-15',
    horaNacimiento: '08:30',
    
    nombre: 'María Guadalupe',
    apellidoPaterno: 'López',
    apellidoMaterno: 'García',
    nombreCompleto: 'María Guadalupe López García',
    sexo: 'F',
    curp: 'LOGM950315MOCDRS09',
    estadoVital: 'Vivo',
    
    nombrePadre: 'José Antonio López Martínez',
    edadPadre: 32,
    nacionalidadPadre: 'Mexicana',
    
    nombreMadre: 'Ana María García Hernández',
    edadMadre: 28,
    nacionalidadMadre: 'Mexicana',
    
    estado: 'Activa',
    fechaRegistro: '1995-03-20'
  };

  constructor(public dialogRef: MatDialogRef<ActaDetalleComponent>, private router: Router) {}

  cerrar(): void {
    this.dialogRef.close();
  }

  usarDatos(): void {
    this.dialogRef.close(this.actaData);
  }

  generar(): void {
   this.cerrar();
   this.router.navigate(['/generar'])
  }

  getSexoLabel(sexo: string): string {
    switch(sexo) {
      case 'M': return 'Masculino';
      case 'F': return 'Femenino';
      case 'N': return 'No especificado';
      default: return sexo;
    }
  }

  formatearFecha(fecha: string): string {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-MX', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }
}
