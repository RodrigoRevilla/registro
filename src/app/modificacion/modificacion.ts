import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../http';
import { AuthService } from '../auth';

@Component({
  selector: 'app-modificacion',
  standalone: true,
  templateUrl: './modificacion.html',
  styleUrls: ['./modificacion.scss'],
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatOptionModule,
    MatTooltipModule
  ]
})
export class ModificacionComponent {

  private baseUrl = '/api/v1';

  loginForm: FormGroup;
  formulario: FormGroup;

  respuestaBackend: any = null;

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private http: HttpClient,
    private apiService: ApiService,
    private authService: AuthService
  ) {

    this.loginForm = this.fb.group({
      username: ['operador1'],
      password: ['mi_password']
    });

    this.formulario = this.fb.group({
      folio: [''],
      estadoSeleccionado: [''],
      servicio: [''],
      tipoActa: [''],
      anio: [''],
      aniosBusqueda: [''],
      rangoBusqueda: [''],
      fechaRegistro: [''],
      oficialia: [''],
      noActa: [''],
      noFoja: [''],
      localidad: [''],
      estadoRegistro: [''],
      distrito: [''],
      municipio: [''],
      nombres: [''],
      fechaSolicitud: [''],
      fechaEntrega: [''],
      fechaPago: [''],
      observaciones: ['']
    });
  }

  private getHeaders(): HttpHeaders | null {
    const token = this.authService.getToken();
    if (!token) { alert('Primero debes hacer login'); return null; }
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  login(): void {
    const { username, password } = this.loginForm.value;

    this.http.post(`${this.baseUrl}/auth/login`, { username, password }).subscribe({
      next: (resp: any) => {
        console.log('Login response:', resp);
        if (resp.ok) {
          this.authService.login(resp.data.token, resp.data.usuario);
          alert('Login correcto');
        }
      },
      error: (err) => {
        console.error('Error login:', err);
        alert('Error en login');
      }
    });
  }

  buscarSolicitud(): void {
    const folio = this.formulario.get('folio')?.value?.trim();
    console.log('[buscarSolicitud] folio:', folio);
    if (!folio) { alert('Ingresa un folio'); return; }

    const headers = this.getHeaders();
    if (!headers) return;

    this.http.get(`${this.baseUrl}/solicitudes/folio/${folio}`, { headers })
      .subscribe({
        next: (resp: any) => {
          console.log('[buscarSolicitud] respuesta:', resp);
          this.respuestaBackend = resp;
          if (resp.ok && resp.data) {
            const d = resp.data;
            console.log('[buscarSolicitud] data:', d);
            this.formulario.patchValue({
              anio: d.fecha_recepcion ? new Date(d.fecha_recepcion).getFullYear() : '',
              fechaRegistro: d.fecha_recepcion?.split('T')[0] ?? '',
              fechaEntrega: d.fecha_entrega_resultado?.split('T')[0] ?? '',
            });
            this.http.get(`${this.baseUrl}/solicitudes/${d.id}/comentarios`, { headers })
              .subscribe({
                next: (respComentarios: any) => {
                  console.log('[buscarSolicitud] comentarios:', respComentarios);
                  if (respComentarios.ok && respComentarios.data?.length) {
                    const ultimo = respComentarios.data.at(-1);
                    this.formulario.patchValue({ observaciones: ultimo.comentario });
                  }
                },
                error: (err) => console.error('[comentarios]', err)
              });
          }
        },
        error: (err) => {
          console.error('[buscarSolicitud] error:', err);
          console.error('[buscarSolicitud] error.error:', err.error);
          this.respuestaBackend = err.error;
        }
      });
  }

  reImprimir(): void {
    const id = this.respuestaBackend?.data?.id;
    if (!id) { alert('Primero busca una solicitud'); return; }

    const folioHoja = this.formulario.get('folio')?.value?.trim();
    if (!folioHoja) { alert('No hay folio para reimprimir'); return; }

    const headers = this.getHeaders();
    if (!headers) return;

    this.http.post(
      `${this.baseUrl}/solicitudes/${id}/impresion`,
      { folio_hoja_valorada: folioHoja },
      { headers }
    ).subscribe({
      next: (resp: any) => {
        console.log('[reImprimir] impresión registrada:', resp);
        this.http.get(`${this.baseUrl}/solicitudes/${id}/pago`, { headers })
          .subscribe({
            next: (respPago: any) => {
              console.log('[reImprimir] pago:', respPago);
              const url = respPago?.data?.url_pdf;
              if (url) {
                const ventana = window.open(url, '_blank', `width=${screen.width},height=${screen.height},top=0,left=0`);
                ventana?.addEventListener('load', () => ventana.print());
              } else {
                alert('No se encontró URL del PDF');
              }
            },
            error: (err) => {
              console.error('[reImprimir] error pago:', err);
              alert('Error al obtener el PDF: ' + (err.error?.error?.message ?? 'Error desconocido'));
            }
          });
      },
      error: (err) => {
        console.error('[reImprimir] error impresión:', err);
        alert('Error al registrar impresión: ' + (err.error?.error?.message ?? 'Error desconocido'));
      }
    });
  }

  cancelar(): void {
    this.formulario.reset();
    this.respuestaBackend = null;
  }

  limpiarRegistro(): void {
    this.formulario.reset();
    this.respuestaBackend = null;
  }

  limpiarRegistroSection(): void {
    this.formulario.patchValue({
      localidad: '',
      estadoRegistro: '',
      distrito: '',
      municipio: ''
    });
  }

  guardarCambios(): void {
    const headers = this.getHeaders();
    if (!headers) return;

    const id = this.respuestaBackend?.data?.id;
    if (!id) { alert('Primero busca una solicitud'); return; }

    const estadoClave = this.formulario.get('estadoSeleccionado')?.value;
    const comentario  = this.formulario.get('observaciones')?.value ?? '';
    const usuario = this.authService.getUsuario();
    const areaId  = usuario?.area_id ?? null;

    console.log('[guardarCambios] id:', id);
    console.log('[guardarCambios] estadoClave:', estadoClave);
    console.log('[guardarCambios] comentario:', comentario);
    console.log('[guardarCambios] area_id:', areaId);

    if (!estadoClave && !comentario) {
      alert('Selecciona un estado o escribe un comentario');
      return;
    }

    if (comentario) {
      const bodyComentario: any = { comentario };
      if (areaId) bodyComentario.area_id = areaId;

      this.http.post(
        `${this.baseUrl}/solicitudes/${id}/comentarios`,
        bodyComentario,
        { headers }
      ).subscribe({
        next: (resp: any) => console.log('[guardarCambios] comentario guardado con area_id:', areaId, resp),
        error: (err) => console.error('[guardarCambios] error comentario:', err)
      });
    }

    if (estadoClave) {
      const body = { estado_destino_clave: estadoClave, comentario };
      console.log('[guardarCambios] body cambio-estado:', body);

      this.http.post(
        `${this.baseUrl}/solicitudes/${id}/cambio-estado`,
        body,
        { headers }
      ).subscribe({
        next: (resp: any) => {
          console.log('[guardarCambios] cambio-estado respuesta:', resp);
          this.respuestaBackend = resp;
          alert('Cambios guardados correctamente');
        },
        error: (err) => {
          console.error('[guardarCambios] error cambio-estado:', err);
          console.error('[guardarCambios] status:', err.status);
          console.error('[guardarCambios] error.error:', err.error);
          this.respuestaBackend = err.error;
          alert('Error al cambiar estado: ' + (err.error?.error?.message ?? 'Error desconocido'));
        }
      });
    } else {
      alert('Comentario guardado correctamente');
    }
  }

  goHome(): void {
    this.router.navigate(['/home']);
  }
}