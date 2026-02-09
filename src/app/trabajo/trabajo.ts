import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';

interface YearRange {
  range: string;
  start: number;
  end: number;
  count: number;
}

interface Payment {
  id: string;
  fecha: string;
  fechaObj?: Date;
  monto: string;
  concepto: string;
  referencia: string;
  metodo: string;
  tipo?: 'pagado' | 'negativo' | 'fotocopia' | 'validacion';
}

type FilterType = 'todos' | 'pagados' | 'negativos' | 'fotocopias' | 'validaciones';

@Component({
  selector: 'app-trabajo',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatDividerModule,
    MatSelectModule
  ],
  templateUrl: './trabajo.html',
  styleUrls: ['./trabajo.scss']
})
export class TrabajoComponent implements OnInit {

  fechaPago: Date | null = null;
  currentFilter: FilterType = 'todos';
  selectedYearRange: string | null = null;
  isLoading: boolean = false;
  payments: Payment[] = [];

  yearRanges: YearRange[] = [
    { range: '1916-1949', start: 1916, end: 1949, count: 245 },
    { range: '1950-1959', start: 1950, end: 1959, count: 189 },
    { range: '1960-1969', start: 1960, end: 1969, count: 312 },
    { range: '1970-1979', start: 1970, end: 1979, count: 428 },
    { range: '1980-1989', start: 1980, end: 1989, count: 567 },
    { range: '1990-1999', start: 1990, end: 1999, count: 734 },
    { range: '2000-2009', start: 2000, end: 2009, count: 891 },
    { range: '2010-2019', start: 2010, end: 2019, count: 1024 },
    { range: '2020-2029', start: 2020, end: 2029, count: 456 }
  ];

  private samplePayments: Payment[] = [
    { id: 'PAG-2024-001523', fecha: '15/01/2024', monto: '$2,450.00', concepto: 'B05 CERTIFICACION DE ACTAS DEL REGISTRO CIVIL', referencia: 'REF-458792', metodo: 'Transferencia', tipo: 'pagado' },
    { id: 'PAG-2024-001524', fecha: '22/01/2024', monto: '$1,890.00', concepto: 'B08 FOTOCOPIAS CERTIFICADAS DE LAS ACTAS DEL ESTADO CIVIL', referencia: 'REF-458793', metodo: 'Tarjeta', tipo: 'pagado' },
    { id: 'PAG-2023-012456', fecha: '10/12/2023', monto: '$3,200.00', concepto: 'B21 CERTIFICACION DE ACTAS DEL REGISTRO CIVIL', referencia: 'REF-445621', metodo: 'Efectivo', tipo: 'pagado' },
    { id: 'PAG-2024-001525', fecha: '05/02/2024', monto: '$5,100.00', concepto: 'B32 FOTOCOPIAS CERTIFICADAS DE LAS ACTAS DEL ESTADO CIVIL', referencia: 'REF-458794', metodo: 'Transferencia', tipo: 'pagado' },
    { id: 'PAG-2024-001526', fecha: '10/02/2024', monto: '$950.00', concepto: 'B08 FOTOCOPIAS CERTIFICADAS DE LAS ACTAS DEL ESTADO CIVIL', referencia: 'REF-458795', metodo: 'Efectivo', tipo: 'fotocopia' },
    { id: 'PAG-2024-001527', fecha: '18/03/2024', monto: '$1,200.00', concepto: 'B21 CERTIFICACION DE ACTAS DEL REGISTRO CIVIL', referencia: 'REF-458796', metodo: 'Tarjeta', tipo: 'validacion' },
    { id: 'PAG-2023-012457', fecha: '15/11/2023', monto: '$2,500.00', concepto: 'B05 CERTIFICACION DE ACTAS DEL REGISTRO CIVIL', referencia: 'REF-445622', metodo: 'Transferencia', tipo: 'pagado' },
    { id: 'PAG-2023-012458', fecha: '30/10/2023', monto: '$1,750.00', concepto: 'B32 FOTOCOPIAS CERTIFICADAS DE LAS ACTAS DEL ESTADO CIVIL', referencia: 'REF-445623', metodo: 'Efectivo', tipo: 'fotocopia' },
    { id: 'PAG-2022-011234', fecha: '05/09/2022', monto: '$2,800.00', concepto: 'B21 CERTIFICACION DE ACTAS DEL REGISTRO CIVIL', referencia: 'REF-433210', metodo: 'Transferencia', tipo: 'validacion' },
    { id: 'PAG-2021-004321', fecha: '22/06/2021', monto: '$3,100.00', concepto: 'B05 CERTIFICACION DE ACTAS DEL REGISTRO CIVIL', referencia: 'REF-412345', metodo: 'Efectivo', tipo: 'pagado' },
    { id: 'PAG-2020-007654', fecha: '15/04/2020', monto: '$900.00', concepto: 'B32 FOTOCOPIAS CERTIFICADAS DE LAS ACTAS DEL ESTADO CIVIL', referencia: 'REF-400001', metodo: 'Tarjeta', tipo: 'fotocopia' },
    { id: 'PAG-2019-003210', fecha: '10/12/2019', monto: '$1,500.00', concepto: 'B21 CERTIFICACION DE ACTAS DEL REGISTRO CIVIL', referencia: 'REF-389001', metodo: 'Efectivo', tipo: 'pagado' },
    { id: 'PAG-1950-000001', fecha: '05/03/1952', monto: '$1,100.00', concepto: 'B05 CERTIFICACION DE ACTAS DEL REGISTRO CIVIL', referencia: 'REF-195001', metodo: 'Efectivo', tipo: 'pagado' },
    { id: 'PAG-1955-000002', fecha: '20/07/1955', monto: '$2,300.00', concepto: 'B08 FOTOCOPIAS CERTIFICADAS DE LAS ACTAS DEL ESTADO CIVIL', referencia: 'REF-195002', metodo: 'Transferencia', tipo: 'fotocopia' },
    { id: 'PAG-1960-000003', fecha: '15/01/1961', monto: '$1,750.00', concepto: 'B21 CERTIFICACION DE ACTAS DEL REGISTRO CIVIL', referencia: 'REF-196001', metodo: 'Tarjeta', tipo: 'validacion' },
    { id: 'PAG-1965-000004', fecha: '30/06/1965', monto: '$2,500.00', concepto: 'B32 FOTOCOPIAS CERTIFICADAS DE LAS ACTAS DEL ESTADO CIVIL', referencia: 'REF-196002', metodo: 'Efectivo', tipo: 'fotocopia' },
    { id: 'PAG-1980-000005', fecha: '12/09/1982', monto: '$1,900.00', concepto: 'B05 CERTIFICACION DE ACTAS DEL REGISTRO CIVIL', referencia: 'REF-198001', metodo: 'Transferencia', tipo: 'pagado' },
    { id: 'PAG-1985-000006', fecha: '25/11/1985', monto: '$2,750.00', concepto: 'B08 FOTOCOPIAS CERTIFICADAS DE LAS ACTAS DEL ESTADO CIVIL', referencia: 'REF-198002', metodo: 'Tarjeta', tipo: 'fotocopia' },
    { id: 'PAG-1990-000007', fecha: '01/03/1992', monto: '$3,200.00', concepto: 'B21 CERTIFICACION DE ACTAS DEL REGISTRO CIVIL', referencia: 'REF-199001', metodo: 'Efectivo', tipo: 'validacion' },
    { id: 'PAG-1995-000008', fecha: '18/08/1997', monto: '$1,850.00', concepto: 'B32 FOTOCOPIAS CERTIFICADAS DE LAS ACTAS DEL ESTADO CIVIL', referencia: 'REF-199002', metodo: 'Transferencia', tipo: 'fotocopia' },
    { id: 'PAG-2024-NEG001', fecha: '12/01/2024', monto: '-$500.00', concepto: 'Reembolso B05 CERTIFICACION DE ACTAS', referencia: 'REF-NEG001', metodo: 'Transferencia', tipo: 'negativo' },
    { id: 'PAG-2023-NEG002', fecha: '25/03/2023', monto: '-$750.00', concepto: 'Reembolso B32 FOTOCOPIAS CERTIFICADAS', referencia: 'REF-NEG002', metodo: 'Efectivo', tipo: 'negativo' },
    { id: 'PAG-2022-NEG003', fecha: '10/07/2022', monto: '-$1,200.00', concepto: 'Corrección de pago B21 CERTIFICACION', referencia: 'REF-NEG003', metodo: 'Tarjeta', tipo: 'negativo' },
    { id: 'PAG-2021-NEG004', fecha: '05/11/2021', monto: '-$900.00', concepto: 'Devolución B08 FOTOCOPIAS CERTIFICADAS', referencia: 'REF-NEG004', metodo: 'Transferencia', tipo: 'negativo' },
    { id: 'PAG-1998-NEG005', fecha: '15/06/1998', monto: '-$1,050.00', concepto: 'Reembolso B05 CERTIFICACION DE ACTAS', referencia: 'REF-NEG005', metodo: 'Efectivo', tipo: 'negativo' }
  ];

  constructor(private router: Router) { }

  ngOnInit(): void {
    this.samplePayments.forEach(p => p.fechaObj = this.parseDate(p.fecha));
    this.buscarPagos();
  }

  goHome() {
    this.router.navigate(['/home']);
  }

  private parseDate(str: string): Date {
    const [day, month, year] = str.split('/').map(Number);
    return new Date(year, month - 1, day);
  }

  setFilter(filter: FilterType): void {
    this.currentFilter = filter;
    this.buscarPagos();
  }

  selectYearRange(range: string): void {
    this.selectedYearRange = this.selectedYearRange === range ? null : range;
    this.buscarPagos();
  }

  isYearRangeSelected(range: string): boolean {
    return this.selectedYearRange === range;
  }

  buscarPagos(): void {
    this.isLoading = true;
    this.payments = this.filterPayments();
    this.isLoading = false;
  }

  private filterPayments(): Payment[] {
    let filtered = [...this.samplePayments];

    if (this.currentFilter !== 'todos') {
      filtered = filtered.filter(p => {
        switch (this.currentFilter) {
          case 'pagados': return p.tipo === 'pagado';
          case 'negativos': return p.tipo === 'negativo';
          case 'fotocopias': return p.tipo === 'fotocopia';
          case 'validaciones': return p.tipo === 'validacion';
          default: return true;
        }
      });
    }

    if (this.selectedYearRange) {
      const [start, end] = this.selectedYearRange.split('-').map(Number);
      filtered = filtered.filter(p => {
        const year = p.fechaObj!.getFullYear();
        return year >= start && year <= end;
      });
    }

    if (this.fechaPago) {
      filtered = filtered.filter(p =>
        p.fechaObj!.toDateString() === this.fechaPago!.toDateString()
      );
    }

    return filtered;
  }

  get resultsCount(): string {
    const count = this.payments.length;
    return `${count} registro${count !== 1 ? 's' : ''}`;
  }

  verDetalles(payment: Payment): void {
    const popup = window.open('', '_blank', 'width=800,height=600');
    if (popup) {
      popup.document.open();
      popup.document.write(`
      <html>
        <head>
          <title>Detalle de Pago - ${payment.id}</title>
          <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
          <style>
            body {
              font-family: 'Roboto', sans-serif;
              margin: 0;
              padding: 20px;
              background: #f9f9f9;
            }
            .comprobante {
              max-width: 600px;
              margin: 20px auto;
              background: #fff;
              padding: 20px;
              border-radius: 8px;
              box-shadow: 0 2px 6px rgba(0,0,0,0.1);
              border: 1px solid #ddd;
              text-align: center;
            }
            .logo {
              display: block;
              margin: 0 auto 10px auto;
              max-width: 150px;
            }
            h1 {
              font-size: 24px;
              margin-bottom: 5px;
            }
            h2 {
              font-size: 18px;
              margin-top: 0;
              color: #555;
            }
            .payment-details {
              text-align: left;
              margin-top: 20px;
            }
            .detail-item {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #eee;
            }
            .detail-item strong {
              font-weight: 500;
            }
            .total {
              font-size: 18px;
              font-weight: 700;
              text-align: right;
              margin-top: 15px;
              color: #007BFF;
            }
          </style>
        </head>
        <body>
          <div class="comprobante">
            <h1>Comprobante de Pago</h1>
            <h2>ID: ${payment.id}</h2>
            <div class="payment-details">
              <div class="detail-item"><span>Fecha:</span><span>${payment.fecha}</span></div>
              <div class="detail-item"><span>Monto:</span><span>${payment.monto}</span></div>
              <div class="detail-item"><span>Concepto:</span><span>${payment.concepto}</span></div>
              <div class="detail-item"><span>Referencia:</span><span>${payment.referencia}</span></div>
              <div class="detail-item"><span>Método de Pago:</span><span>${payment.metodo}</span></div>
              <div class="total">Total: ${payment.monto}</div>
            </div>
          </div>
        </body>
      </html>
    `);
      popup.document.close();
    }
  }


  descargarComprobante(payment: Payment): void {
    console.log('Descargar comprobante:', payment);
  }

  imprimirComprobante(payment: Payment): void {
    const printContents = document.getElementById(`payment-${payment.id}`)?.innerHTML;
    if (!printContents) return;

    const popup = window.open('', '_blank', 'width=800,height=600');
    if (popup) {
      popup.document.open();
      popup.document.write(`
      <html>
        <head>
          <title>Comprobante de Pago</title>
          <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
          <style>
            body {
              font-family: 'Roboto', sans-serif;
              margin: 0;
              padding: 20px;
              background: #f9f9f9;
            }
            .comprobante {
              max-width: 600px;
              margin: 0 auto;
              background: #fff;
              padding: 20px;
              border-radius: 8px;
              box-shadow: 0 2px 6px rgba(0,0,0,0.1);
              border: 1px solid #ddd;
            }
            .comprobante h1 {
              font-size: 24px;
              margin-bottom: 5px;
              text-align: center;
            }
            .comprobante h2 {
              font-size: 18px;
              margin-top: 0;
              text-align: center;
              color: #555;
            }
            .comprobante .payment-details {
              margin-top: 20px;
            }
            .detail-item {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #eee;
            }
            .detail-item strong {
              font-weight: 500;
            }
            .total {
              font-size: 18px;
              font-weight: 700;
              text-align: right;
              margin-top: 15px;
              color: #007BFF;
            }
            .footer {
              text-align: center;
              font-size: 12px;
              color: #888;
              margin-top: 20px;
            }
            .payment-actions { display: none; } /* Ocultar botones */
          </style>
        </head>
        <body>
          <div class="comprobante">
            <h1>Comprobante de Pago</h1>
            <h2>ID: ${payment.id}</h2>
            <div class="payment-details">
              <div class="detail-item"><span>Fecha:</span><span>${payment.fecha}</span></div>
              <div class="detail-item"><span>Monto:</span><span>${payment.monto}</span></div>
              <div class="detail-item"><span>Concepto:</span><span>${payment.concepto}</span></div>
              <div class="detail-item"><span>Referencia:</span><span>${payment.referencia}</span></div>
              <div class="detail-item"><span>Método de Pago:</span><span>${payment.metodo}</span></div>
              <div class="total">Total: ${payment.monto}</div>
            </div>
            <div class="footer">
              Este comprobante es generado automáticamente por el sistema.
            </div>
          </div>
        </body>
      </html>
    `);
      popup.document.close();
      setTimeout(() => { popup.print(); popup.close(); }, 100);
    }
  }


  get filters(): Array<{ value: FilterType, label: string }> {
    return [
      { value: 'todos', label: 'Todos' },
      { value: 'pagados', label: 'Pagados' },
      { value: 'negativos', label: 'Negativos' },
      { value: 'fotocopias', label: 'Fotocopias' },
      { value: 'validaciones', label: 'Validaciones' }
    ];
  }
}
