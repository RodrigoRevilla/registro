import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
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
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatExpansionModule,
  ],
  templateUrl: './nacimiento.html',
  styleUrls: ['./nacimiento.scss']
})
export class NacimientoComponent implements OnInit {

  nacimientoForm: FormGroup;

  constructor(
    private fb:     FormBuilder,
    private router: Router,
    private dialog: MatDialog,
    private http:   HttpClient,
  ) {
    this.nacimientoForm = this.fb.group({
      entidad:             [''],
      municipio:           [''],
      oficialia:           [''],
      distrito:            [''],
      fechaRegistro:       [null],
      anioRegistro:        [''],
      foja:                [''],
      numeroActa:          [''],
      curp:                [''],
      curp_regciv:         [''],
      entidadNacimiento:   [''],
      municipioNacimiento: [''],
      distritoNacimiento:  [''],
      localidad:           [''],
      localidadNacimiento: [''],
      fechaNacimiento:     [''],
      horaNacimiento:      [''],
      nombre:              [''],
      apellidoPaterno:     [''],
      apellidoMaterno:     [''],
      sexo:                [''],
      libro:               [''],
      status:              [''],
      nombrePadre:         [''],
      edadPadre:           [''],
      nacionalidadPadre:   [''],
      nombreMadre:         [''],
      edadMadre:           [''],
      nacionalidadMadre:   [''],
    });

    this.nacimientoForm.get('fechaRegistro')?.valueChanges.subscribe((fecha: Date) => {
      if (fecha) {
        this.nacimientoForm.patchValue(
          { anioRegistro: new Date(fecha).getFullYear() },
          { emitEvent: false }
        );
      }
    });
  }

  ngOnInit(): void {}

  mostrarNombre(m: any): string {
    return m ? (typeof m === 'string' ? m : m.nombre) : '';
  }

  goHome(): void {
    this.router.navigate(['/home']);
  }

  limpiarFormulario(): void {
    this.nacimientoForm.reset();
  }

  buscarActa(): void {
    const dialogRef = this.dialog.open(ActaDetalleComponent, {
      width:        '95vw',
      height:       '90vh',
      maxWidth:     '1400px',
      panelClass:   'acta-detalle-dialog',
      disableClose: false,
      autoFocus:    true,
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.rellenarFormulario(result);
    });
  }

  rellenarFormulario(datos: any): void {
    this.nacimientoForm.patchValue({
      entidad:             datos.entidad,
      municipio:           datos.municipio,
      oficialia:           datos.oficialia,
      distrito:            datos.distrito,
      fechaRegistro:       datos.fechaRegistro ? new Date(datos.fechaRegistro) : null,
      anioRegistro:        datos.anioRegistro,
      foja:                datos.foja,
      numeroActa:          datos.numeroActa,
      curp:                datos.curp,
      entidadNacimiento:   datos.entidadNacimiento,
      municipioNacimiento: datos.municipioNacimiento,
      distritoNacimiento:  datos.distritoNacimiento,
      localidad:           datos.localidad,
      fechaNacimiento:     datos.fechaNacimiento,
      horaNacimiento:      datos.horaNacimiento,
      nombre:              datos.nombre,
      apellidoPaterno:     datos.apellidoPaterno,
      apellidoMaterno:     datos.apellidoMaterno,
      sexo:                datos.sexo,
      libro:               datos.libro,
      status:              datos.status,
      nombrePadre:         datos.nombrePadre,
      edadPadre:           datos.edadPadre,
      nombreMadre:         datos.nombreMadre,
      edadMadre:           datos.edadMadre,
    });
  }
}