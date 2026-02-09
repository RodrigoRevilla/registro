import { Component } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { ActaDetalleComponent } from '../acta-detalle/acta-detalle';

@Component({
  selector: 'app-nacimiento',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatExpansionModule
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
      distritoNacimiento: [''],
      localidad: [''],
      fechaNacimiento: [''],
      horaNacimiento: [''],
      nombre: [''],
      apellidoPaterno: [''],
      apellidoMaterno: [''],
      sexo: [''],
      libro: [''],
      status: [''],
      nombrePadre: [''],
      edadPadre: [''],
      nombreMadre: [''],
      edadMadre: ['']
    });
  }

  goHome() {
    this.router.navigate(['/home']);
  }
  limpiarFormulario() {
    this.nacimientoForm.reset();
  }
  buscarActa() {
    const dialogRef = this.dialog.open(ActaDetalleComponent, {
      width: '95vw',
      height: '90vh',
      maxWidth: '1400px',
      panelClass: 'acta-detalle-dialog',
      disableClose: false,
      autoFocus: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
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
      distritoNacimiento: datos.distritoNacimiento,
      localidad: datos.localidad,
      fechaNacimiento: datos.fechaNacimiento,
      horaNacimiento: datos.horaNacimiento,
      nombre: datos.nombre,
      apellidoPaterno: datos.apellidoPaterno,
      apellidoMaterno: datos.apellidoMaterno,
      sexo: datos.sexo,
      libro: datos.libro,
      status: datos.status,
      nombrePadre: datos.nombrePadre,
      edadPadre: datos.edadPadre,
      nombreMadre: datos.nombreMadre,
      edadMadre: datos.edadMadre
    });
    console.log('Formulario rellenado con éxito');
  }
}
