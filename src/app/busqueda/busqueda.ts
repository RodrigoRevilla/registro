import { Component, OnInit, ViewChild, AfterViewInit, TemplateRef } from '@angular/core';
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
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

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
export class BusquedaComponent implements OnInit, AfterViewInit {
  busquedaForm!: FormGroup;
  dataSource = new MatTableDataSource<Pago>();
  cargando = false;
  sinResultados = false;

  columnasTabla: string[] = [
    'id', 'fecha', 'concepto', 'monto', 'estado', 'beneficiario', 'acciones'
  ];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild('detalleDialog') detalleDialog!: TemplateRef<any>;

  pagoSeleccionado!: Pago;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    this.inicializarFormulario();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  inicializarFormulario(): void {
    this.busquedaForm = this.fb.group({
      fecha: [null, Validators.required],
      estado: [null]
    });
  }

  buscarPagos(): void {
    if (this.busquedaForm.invalid) {
      return;
    }

    const { fecha, estado } = this.busquedaForm.value;

    this.cargando = true;

    const datos = this.obtenerDatosMock(fecha, estado);

    this.dataSource.data = datos;
    this.sinResultados = datos.length === 0;
    this.cargando = false;
  }

  obtenerDatosMock(fechaSeleccionada: Date, estado: string): Pago[] {
    const pagosSimulados: Pago[] = [
      { id: 1001, fecha: new Date(2026, 1, 9), concepto: 'Acta de nacimiento certificada', monto: 150, estado: 'completado', beneficiario: 'Juan Pérez García' },
      { id: 1002, fecha: new Date(2026, 1, 9), concepto: 'Trámite de constancia', monto: 450.5, estado: 'pendiente', beneficiario: 'María López Hernández' },
      { id: 1003, fecha: new Date(2026, 1, 9), concepto: 'Certificación de documentos', monto: 800, estado: 'completado', beneficiario: 'Carlos Ramírez Sánchez' },
      { id: 1004, fecha: new Date(2026, 1, 9), concepto: 'Registro de acta de matrimonio', monto: 320, estado: 'cancelado', beneficiario: 'Ana Martínez Torres' },
      { id: 1005, fecha: new Date(2026, 1, 9), concepto: 'Copia certificada de acta', monto: 95, estado: 'completado', beneficiario: 'Roberto González Díaz' },
      { id: 1006, fecha: new Date(2026, 1, 8), concepto: 'Apostilla de documentos', monto: 1200, estado: 'completado', beneficiario: 'Laura Sánchez Ruiz' },
      { id: 1007, fecha: new Date(2026, 1, 8), concepto: 'Trámite de CURP', monto: 0, estado: 'completado', beneficiario: 'Pedro Hernández López' },
      { id: 1008, fecha: new Date(2026, 1, 8), concepto: 'Pago de multa administrativa', monto: 2500, estado: 'pendiente', beneficiario: 'Sofía Morales Castro' },
      { id: 1009, fecha: new Date(2026, 1, 7), concepto: 'Tramite de acta de defuncion', monto: 5000, estado: 'completado', beneficiario: 'José Luis Fernández' },
      { id: 1010, fecha: new Date(2026, 1, 7), concepto: 'Certificacion de documentos', monto: 3200, estado: 'pendiente', beneficiario: 'Diana Patricia Vargas' },
      { id: 1011, fecha: new Date(2026, 1, 10), concepto: 'Constancia del registro civil', monto: 350, estado: 'completado', beneficiario: 'Ulrich Zwingli' }
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
    this.dataSource.data = [];
    this.sinResultados = false;
  }

  verDetalle(pago: Pago): void {
    this.pagoSeleccionado = pago;
    this.dialog.open(this.detalleDialog, {
      width: '450px',
      maxWidth: '90vw',
      data: { pago }
    });
  }

  imprimir(pago: Pago): void {
    console.log('Imprimir comprobante de:', pago);

    const printContents = `
      <div class="print-container">
        <h1>Comprobante de Pago</h1>
        <h2>Pago #${pago.id}</h2>
        <div class="detalle-row"><strong>Fecha:</strong> ${pago.fecha.toLocaleDateString()}</div>
        <div class="detalle-row"><strong>Concepto:</strong> ${pago.concepto}</div>
        <div class="detalle-row"><strong>Monto:</strong> ${pago.monto.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</div>
        <div class="detalle-row"><strong>Beneficiario:</strong> ${pago.beneficiario}</div>
        <div class="detalle-row"><strong>Estado:</strong> ${pago.estado}</div>
      </div>
    `;

    const styles = `
      <style>
        body {
          font-family: 'Roboto', sans-serif;
          color: #333;
          padding: 2rem;
        }
        .print-container {
          max-width: 600px;
          margin: 0 auto;
          border: 1px solid #1976d2;
          border-radius: 8px;
          padding: 2rem;
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        h1 {
          text-align: center;
          color: #1976d2;
          margin-bottom: 0.5rem;
          font-size: 1.8rem;
        }
        h2 {
          text-align: center;
          font-weight: 500;
          margin-bottom: 1.5rem;
          font-size: 1.2rem;
          color: #555;
        }
        .detalle-row {
          font-size: 1rem;
          margin-bottom: 1rem;
          display: flex;
          justify-content: space-between;
        }
        .detalle-row strong {
          color: #1976d2;
          font-weight: 600;
        }
      </style>
    `;

    const popupWin = window.open('', '_blank', 'width=700,height=700');
    popupWin?.document.write(`
      <html>
        <head>
          <title>Comprobante de Pago</title>
          ${styles}
        </head>
        <body>
          ${printContents}
        </body>
      </html>
    `);
    popupWin?.document.close();
    popupWin?.print();
  }

  cerrarDialog(): void {
    this.dialog.closeAll();
  }

  goHome(): void {
    this.router.navigate(['/home']);
  }
  imprimirTodos(): void {
    if (this.dataSource.data.length === 0) {
      return;
    }

    const comprobantesHtml = this.dataSource.data.map((pago, index) => `
    <div class="print-container">
      <h1>Comprobante de Pago</h1>
      <h2>Pago #${pago.id}</h2>
      <div class="detalle-row"><strong>Fecha:</strong> ${pago.fecha.toLocaleDateString()}</div>
      <div class="detalle-row"><strong>Concepto:</strong> ${pago.concepto}</div>
      <div class="detalle-row"><strong>Monto:</strong> ${pago.monto.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</div>
      <div class="detalle-row"><strong>Beneficiario:</strong> ${pago.beneficiario}</div>
      <div class="detalle-row"><strong>Estado:</strong> ${pago.estado}</div>
    </div>
    ${index < this.dataSource.data.length - 1 ? '<div class="page-break"></div>' : ''}
  `).join('');

    const styles = `
    <style>
      body {
        font-family: 'Roboto', sans-serif;
        color: #333;
        padding: 2rem;
      }

      .print-container {
        max-width: 600px;
        margin: 0 auto;
        border: 1px solid #1976d2;
        border-radius: 8px;
        padding: 2rem;
        margin-bottom: 2rem;
      }

      h1 {
        text-align: center;
        color: #1976d2;
        margin-bottom: 0.5rem;
        font-size: 1.6rem;
      }

      h2 {
        text-align: center;
        font-weight: 500;
        margin-bottom: 1.5rem;
        font-size: 1.1rem;
        color: #555;
      }

      .detalle-row {
        font-size: 1rem;
        margin-bottom: 1rem;
        display: flex;
        justify-content: space-between;
      }

      .detalle-row strong {
        color: #1976d2;
        font-weight: 600;
      }

      .page-break {
        page-break-after: always;
      }

      @media print {
        .page-break {
          page-break-after: always;
        }
      }
    </style>
  `;

    const popupWin = window.open('', '_blank', 'width=800,height=800');

    popupWin?.document.write(`
    <html>
      <head>
        <title>Comprobantes de Pago</title>
        ${styles}
      </head>
      <body>
        ${comprobantesHtml}
      </body>
    </html>
  `);

    popupWin?.document.close();
    popupWin?.focus();
    popupWin?.print();
  }

  exportarExcel(): void {
    if (this.dataSource.data.length === 0) {
      return;
    }

    const datosExcel = this.dataSource.data.map(pago => ({
      ID: pago.id,
      Fecha: pago.fecha.toLocaleDateString(),
      Concepto: pago.concepto,
      Monto: pago.monto,
      Estado: pago.estado,
      Beneficiario: pago.beneficiario
    }));

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(datosExcel);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pagos');

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    saveAs(blob, `pagos_${new Date().toISOString().split('T')[0]}.xlsx`);
  }
}
