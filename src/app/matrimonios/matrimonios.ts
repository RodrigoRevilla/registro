import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../auth';
import { ApiService } from '../http';

@Component({
  selector: 'app-matrimonios',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTooltipModule,
  ],
  templateUrl: './matrimonios.html',
  styleUrl: './matrimonios.scss',
})
export class MatrimoniosComponent implements OnInit {

  matrimonioForm!: FormGroup;
  tiposServicio:   any[] = [];
  procesando       = false;

  constructor(
    private fb:          FormBuilder,
    private router:      Router,
    private authService: AuthService,
    private cdr:         ChangeDetectorRef,
    private apiService:  ApiService,
  ) {}

  ngOnInit(): void {
    if (!this.authService.getToken()) {
      this.router.navigate(['/login']);
      return;
    }

    this.matrimonioForm = this.fb.group({
      entidad:         [''],
      municipio:       [''],
      oficialia:       [''],
      distrito:        [''],
      localidad:       [''],
      curpMat:         [''],
      anio:            [''],
      acta:            [''],
      enDoc:           [''],
      fechaRegistro:   [''],
      nombre1:          [''],
      apellidoPaterno1: [''],
      apellidoMaterno1: [''],
      crip1:            [''],
      fechaNacimiento1: [''],
      nombre2:          [''],
      apellidoPaterno2: [''],
      apellidoMaterno2: [''],
      crip2:            [''],
      fechaNacimiento2: [''],
      status:           [''],
    });

    this.apiService.getTiposServicio().subscribe({
      next: resp => {
        if (resp.ok) {
          this.tiposServicio = resp.data;
          this.cdr.detectChanges();
        }
      },
      error: err => console.error('Error tipos de servicio:', err.status),
    });
  }

  private toDateStr(val: Date | string | null): string {
    if (!val) return '';
    if (val instanceof Date) return val.toLocaleDateString('es-MX', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
    return val;
  }

  buscarActa(): void {
    alert('Búsqueda de acta — pendiente de implementación');
  }

  generarSolicitud(): void {
    const f = this.matrimonioForm.value;

    this.router.navigate(['/matrimonios/solicitud'], {
      state: {
        tiposServicio:    this.tiposServicio,
        entidad:          f.entidad          ?? '',
        municipio:        f.municipio        ?? '',
        oficialia:        f.oficialia        ?? '',
        distrito:         f.distrito         ?? '',
        localidad:        f.localidad        ?? '',
        curpMat:          f.curpMat          ?? '',
        anio:             f.anio             ?? '',
        acta:             f.acta             ?? '',
        enDoc:            f.enDoc            ?? '',
        fechaRegistro:    this.toDateStr(f.fechaRegistro),
        nombre1:           f.nombre1           ?? '',
        apellidoPaterno1:  f.apellidoPaterno1   ?? '',
        apellidoMaterno1:  f.apellidoMaterno1   ?? '',
        crip1:             f.crip1             ?? '',
        fechaNacimiento1:  this.toDateStr(f.fechaNacimiento1),
        nombre2:           f.nombre2           ?? '',
        apellidoPaterno2:  f.apellidoPaterno2   ?? '',
        apellidoMaterno2:  f.apellidoMaterno2   ?? '',
        crip2:             f.crip2             ?? '',
        fechaNacimiento2:  this.toDateStr(f.fechaNacimiento2),
        status:            f.status            ?? '',
      },
    });
  }

  limpiarFormulario(): void {
    this.matrimonioForm.reset();
  }

  goHome(): void {
    this.router.navigate(['/home']);
  }
}