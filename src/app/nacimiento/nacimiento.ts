import { Component } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog } from '@angular/material/dialog';
import { ActaDetalleComponent } from '../acta-detalle/acta-detalle';

@Component({
  selector: 'app-nacimiento',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatDividerModule,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule
  ],
  templateUrl: './nacimiento.html',
  styleUrls: ['./nacimiento.scss']
})
export class NacimientoComponent {
  nacimientoForm: FormGroup;

  constructor(
    private fb: FormBuilder, 
    private router: Router,
    private dialog: MatDialog
  ) {
    this.nacimientoForm = this.fb.group({
      entidad: [''],
      municipio: [''],
      oficialia: [''],
      distrito: [''],
      anioRegistro: [''],
      curp: [''],
      entidadNacimiento: [''],
      municipioNacimiento: [''],
      localidad: [''],
      fechaNacimiento: [''],
      horaNacimiento: [''],
      nombre: [''],
      apellidoPaterno: [''],
      apellidoMaterno: [''],
      sexo: [''],
      nombrePadre: [''],
      nombreMadre: [''],
      observaciones: ['']
    });
  }

  limpiarFormulario() {
    this.nacimientoForm.reset();
  }

  buscarActa() {
    const dialogRef = this.dialog.open(ActaDetalleComponent, {
      width: '90%',
      maxWidth: '1000px',
      maxHeight: '90vh',
      panelClass: 'acta-detalle-dialog',
      disableClose: false,
      autoFocus: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Si el usuario presionó "Usar estos datos", rellenar el formulario
        this.rellenarFormulario(result);
      }
    });
  }

  rellenarFormulario(datos: any): void {
    this.nacimientoForm.patchValue({
      entidad: datos.entidad,
      municipio: datos.municipio,
      oficialia: datos.oficialia,
      distrito: datos.distrito,
      anioRegistro: datos.anioRegistro,
      curp: datos.curp,
      entidadNacimiento: datos.entidadNacimiento,
      municipioNacimiento: datos.municipioNacimiento,
      localidad: datos.localidad,
      fechaNacimiento: datos.fechaNacimiento,
      horaNacimiento: datos.horaNacimiento,
      nombre: datos.nombre,
      apellidoPaterno: datos.apellidoPaterno,
      apellidoMaterno: datos.apellidoMaterno,
      sexo: datos.sexo,
      nombrePadre: datos.nombrePadre,
      nombreMadre: datos.nombreMadre
    });

    // Opcional: Mostrar un mensaje de éxito
    console.log('Formulario rellenado con éxito');
  }
}