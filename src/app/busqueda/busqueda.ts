import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

interface Pago {
  id: number;
  fecha: Date;
  concepto: string;
  monto: number;
  estado: 'pendiente' | 'completado' | 'cancelado';
  beneficiario: string;
}

@Component({
  selector: 'app-busqueda',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatDividerModule,
    MatTableModule,
    MatPaginatorModule,
    MatIconModule,
    MatChipsModule,
    MatMenuModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './busqueda.html',
  styleUrls: ['./busqueda.scss']
})
export class BusquedaComponent implements OnInit {

  busquedaForm!: FormGroup;
  resultados: Pago[] = [];
  cargando = false;
  sinResultados = false;

  columnasTabla: string[] = [
    'id', 'fecha', 'concepto', 'monto', 'estado', 'beneficiario', 'acciones'
  ];

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private fb: FormBuilder,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.inicializarFormulario();
  }

  inicializarFormulario(): void {
    this.busquedaForm = this.fb.group({
      fecha: [null, Validators.required],
      estado: ['']
    });
  }

  buscarPagos(): void {
    if (this.busquedaForm.invalid) {
      return;
    }

    this.busquedaForm.updateValueAndValidity({ emitEvent: false}); 
    const { fecha, estado } = this.busquedaForm.value;

    setTimeout(() => {
      this.resultados = this.obtenerDatosMock(fecha, estado);
      this.sinResultados = this.resultados.length === 0;
      this.cargando = false;
    }, 800);
  }

  obtenerDatosMock(fechaSeleccionada: Date, estado: string): Pago[] {

    const pagosSimulados: Pago[] = [
      { id: 1001, fecha: new Date(2026, 1, 9), concepto: 'Acta de nacimiento certificada', monto: 150, estado: 'completado', beneficiario: 'Juan Pérez García' },
      { id: 1002, fecha: new Date(2026, 1, 9), concepto: 'Trámite de licencia', monto: 450.5, estado: 'pendiente', beneficiario: 'María López Hernández' },
      { id: 1003, fecha: new Date(2026, 1, 9), concepto: 'Certificación de documentos', monto: 800, estado: 'completado', beneficiario: 'Carlos Ramírez Sánchez' },
      { id: 1004, fecha: new Date(2026, 1, 9), concepto: 'Registro de acta de matrimonio', monto: 320, estado: 'cancelado', beneficiario: 'Ana Martínez Torres' },
      { id: 1005, fecha: new Date(2026, 1, 9), concepto: 'Copia certificada de acta', monto: 95, estado: 'completado', beneficiario: 'Roberto González Díaz' },
      { id: 1006, fecha: new Date(2026, 1, 8), concepto: 'Apostilla de documentos', monto: 1200, estado: 'completado', beneficiario: 'Laura Sánchez Ruiz' },
      { id: 1007, fecha: new Date(2026, 1, 8), concepto: 'Trámite de CURP', monto: 0, estado: 'completado', beneficiario: 'Pedro Hernández López' },
      { id: 1008, fecha: new Date(2026, 1, 8), concepto: 'Pago de multa administrativa', monto: 2500, estado: 'pendiente', beneficiario: 'Sofía Morales Castro' },
      { id: 1009, fecha: new Date(2026, 1, 7), concepto: 'Registro de propiedad', monto: 5000, estado: 'completado', beneficiario: 'José Luis Fernández' },
      { id: 1010, fecha: new Date(2026, 1, 7), concepto: 'Permiso de construcción', monto: 3200, estado: 'pendiente', beneficiario: 'Diana Patricia Vargas' }
    ];

    return pagosSimulados.filter(pago => {

      const mismaFecha =
        pago.fecha.getFullYear() === fechaSeleccionada.getFullYear() &&
        pago.fecha.getMonth() === fechaSeleccionada.getMonth() &&
        pago.fecha.getDate() === fechaSeleccionada.getDate();

      const mismoEstado = estado ? pago.estado === estado : true;

      return mismaFecha && mismoEstado;
    });
  }

  limpiarFormulario(): void {
    this.busquedaForm.reset();
    this.resultados = [];
    this.sinResultados = false;
  }

  verDetalle(pago: Pago): void {
    console.log('Ver detalle:', pago);
  }

  descargarComprobante(pago: Pago): void {
    console.log('Descargar comprobante:', pago);
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}
