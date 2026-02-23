import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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
import { AuthService } from '../auth';

interface SolicitudRow {
  id:        number;
  folio:     string;
  fecha:     string;
  concepto:  string;
  estado:    string;
  buscador:  string;
}

interface Catalogo {
  id:     number;
  clave:  string;
  nombre: string;
}

interface ApiResponse<T> {
  ok:   boolean;
  data: T;
  meta?: { total: number; limit: number; offset: number };
}

const ESTADOS_BUSQUEDA = ['EN_BUSQUEDA'];

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
    MatProgressSpinnerModule,
  ],
  templateUrl: './busqueda.html',
  styleUrls: ['./busqueda.scss']
})
export class BusquedaComponent implements OnInit, AfterViewInit {

  private readonly API = '/api/v1';

  busquedaForm!: FormGroup;
  dataSource    = new MatTableDataSource<SolicitudRow>();
  cargando      = false;
  sinResultados = false;

  columnasTabla = ['folio', 'fecha', 'concepto', 'estado', 'acciones'];

  private catalogoActos:     Catalogo[] = [];
  private catalogoServicios: Catalogo[] = [];

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private fb:          FormBuilder,
    private router:      Router,
    private http:        HttpClient,
    private authService: AuthService,
  ) {}

  private get headers(): HttpHeaders {
    const token = this.authService.getToken() ?? '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  async ngOnInit() {
    this.busquedaForm = this.fb.group({ fecha: [null] });
    await this.cargarCatalogos();
    await this.buscarPagos(); 
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  private async cargarCatalogos() {
    try {
      const [actos, servicios] = await Promise.all([
        this.http.get<ApiResponse<Catalogo[]>>(`${this.API}/catalogos/actos-registrales`, { headers: this.headers }).toPromise(),
        this.http.get<ApiResponse<Catalogo[]>>(`${this.API}/catalogos/tipos-servicio`,    { headers: this.headers }).toPromise(),
      ]);
      this.catalogoActos     = actos?.data     ?? [];
      this.catalogoServicios = servicios?.data ?? [];
    } catch (err) {
      console.error('[busqueda] Error cargando catálogos:', err);
    }
  }

  async buscarPagos() {
    this.cargando      = true;
    this.sinResultados = false;
    this.dataSource.data = [];

    try {
      const solicitudes = await this.cargarPorEstado('EN_BUSQUEDA');
      const fechaFiltro: Date | null = this.busquedaForm.get('fecha')?.value;
      const rows = solicitudes
        .filter(s => {
          if (!fechaFiltro) return true;
          const fechaSol = new Date(s.fecha_recepcion);
          return fechaSol.getFullYear() === fechaFiltro.getFullYear()
              && fechaSol.getMonth()    === fechaFiltro.getMonth()
              && fechaSol.getDate()     === fechaFiltro.getDate();
        })
        .map(s => this.toRow(s));

      this.dataSource.data = rows;
      this.sinResultados   = rows.length === 0;
      console.log(`[busqueda] ${rows.length} solicitudes en EN_BUSQUEDA`);
    } catch (err) {
      console.error('[busqueda] Error:', err);
      alert('Error al cargar solicitudes. Verifica tu conexión.');
    } finally {
      this.cargando = false;
    }
  }

  private async cargarPorEstado(estado: string): Promise<any[]> {
    const LIMIT = 100;
    let offset  = 0;
    let total   = Infinity;
    const acumulado: any[] = [];

    while (acumulado.length < total) {
      const resp = await this.http
        .get<ApiResponse<any[]>>(
          `${this.API}/solicitudes?estado=${estado}&limit=${LIMIT}&offset=${offset}`,
          { headers: this.headers }
        ).toPromise();

      if (!resp?.ok || !resp.data?.length) break;
      acumulado.push(...resp.data);

      if (resp.meta) {
        total   = resp.meta.total;
        offset += LIMIT;
        if (offset >= total) break;
      } else {
        break;
      }
    }
    return acumulado;
  }

  private toRow(s: any): SolicitudRow {
    const acto     = this.catalogoActos.find(a => a.id === s.acto_registral_id);
    const servicio = this.catalogoServicios.find(sv => sv.id === s.tipo_servicio_id);
    return {
      id:       s.id,
      folio:    s.folio,
      fecha:    s.fecha_recepcion
                  ? new Date(s.fecha_recepcion).toLocaleDateString('es-MX')
                  : '—',
      concepto: `${acto?.nombre ?? 'Acto ' + s.acto_registral_id} — ${servicio?.nombre ?? 'Servicio ' + s.tipo_servicio_id}`,
      estado:   'EN_BUSQUEDA',
      buscador: s.buscador_id ? `Buscador #${s.buscador_id}` : '—',
    };
  }

  limpiarFormulario() {
    this.busquedaForm.reset();
    this.buscarPagos();
  }

  verDetalle(row: SolicitudRow) {
    this.router.navigate(['/modificacion'], { queryParams: { folio: row.folio } });
  }

  goHome() {
    this.router.navigate(['/home']);
  }
}