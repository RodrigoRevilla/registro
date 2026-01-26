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

  constructor(private fb: FormBuilder, private router: Router) {
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
    const curp = this.nacimientoForm.value.curp || 'TEST1234';
    this.router.navigate(['/acta-detalle', curp]);
  }
}
