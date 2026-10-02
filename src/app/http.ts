import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { AuthService } from './auth';
import { Observable, throwError, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private baseUrl: string = '/api/v1';

  constructor(private http: HttpClient, private authService: AuthService) { }

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    if (!token) throw new Error('Token no disponible. Usuario no autenticado.');
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
  }

  crearSolicitud(datos: any): Observable<any> {
    return this.http
      .post<any>(`${this.baseUrl}/solicitudes`, datos, { headers: this.getHeaders() })
      .pipe(catchError((error) => throwError(() => error)));
  }

  getSolicitud(folio: string) {
    return this.http.get(`${this.baseUrl}/solicitudes/folio/${folio}`);
  }

  getSolicitudPorFolio(folio: string): Observable<any> {
    return this.http
      .get<any>(`${this.baseUrl}/solicitudes/folio/${folio}`, {
        headers: this.getHeaders(),
      })
      .pipe(catchError((error) => throwError(() => error)));
  }

  cambiarEstado(id: number, estado: string, comentario: string = ''): Observable<any> {
    const body = { estado_destino_clave: estado, comentario };
    return this.http
      .post<any>(`${this.baseUrl}/solicitudes/${id}/cambio-estado`, body, { headers: this.getHeaders() })
      .pipe(catchError((error) => throwError(() => error)));
  }

  registrarImpresion(id: number, folio: string): Observable<any> {
    return this.http
      .post<any>(
        `${this.baseUrl}/solicitudes/${id}/impresion`,
        { folio_hoja_valorada: folio },
        { headers: this.getHeaders() }
      )
      .pipe(catchError((error) => throwError(() => error)));
  }

  getTransiciones(id: number): Observable<any> {
    return this.http
      .get<any>(`${this.baseUrl}/solicitudes/${id}/transiciones`, { headers: this.getHeaders() })
      .pipe(catchError((error) => throwError(() => error)));
  }

  getPago(id: number): Observable<any> {
    return this.http
      .get<any>(`${this.baseUrl}/solicitudes/${id}/pago`, {
        headers: this.getHeaders(),
      })
      .pipe(
        catchError((error) => {
          console.warn('getPago error (puede ser normal si no tiene pago):', error.status);
          return of({ data: null });
        })
      );
  }

  confirmarPago(solicitudId: number): Observable<any> {
    console.log('Request confirmarPago:', { solicitudId, url: `TU_URL/${solicitudId}` });
    return this.http.post<any>(
      `${this.baseUrl}/pagos/confirmar`,
      { solicitud_id: solicitudId },
      { headers: this.getHeaders() }
    );
  }

  getActosRegistrales(): Observable<any> {
    return this.http
      .get<any>(`${this.baseUrl}/catalogos/actos-registrales`, { headers: this.getHeaders() })
      .pipe(catchError((error) => throwError(() => error)));
  }

  getTiposServicio(): Observable<any> {
    return this.http
      .get<any>(`${this.baseUrl}/catalogos/tipos-servicio`, { headers: this.getHeaders() })
      .pipe(catchError((error) => throwError(() => error)));
  }

  getEstados(): Observable<any> {
    return this.http
      .get<any>(`${this.baseUrl}/catalogos/estados`, { headers: this.getHeaders() })
      .pipe(catchError((error) => throwError(() => error)));
  }

  getAreas(): Observable<any> {
    return this.http
      .get<any>(`${this.baseUrl}/catalogos/areas`, { headers: this.getHeaders() })
      .pipe(catchError((error) => throwError(() => error)));
  }

  getConteoEstados(): Observable<any> {
    return this.http
      .get<any>(`${this.baseUrl}/dashboard/conteo-estados`, { headers: this.getHeaders() })
      .pipe(catchError((error) => throwError(() => error)));
  }

  private toParams(filtros: Record<string, any>): HttpParams {
    let params = new HttpParams();
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== null && v !== undefined && `${v}`.trim() !== '') {
        params = params.set(k, `${v}`.trim());
      }
    });
    return params;
  }

  getRoles(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/catalogos/roles`, { headers: this.getHeaders() });
  }

  getPermisos(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/catalogos/permisos`, { headers: this.getHeaders() });
  }

  getRegiones(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/catalogos/regiones`, { headers: this.getHeaders() });
  }

  getRegion(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/catalogos/regiones/${id}`, { headers: this.getHeaders() });
  }

  getDistritos(regionId?: number | null): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/catalogos/distritos`, {
      headers: this.getHeaders(),
      params: this.toParams({ region_id: regionId }),
    });
  }

  getDistrito(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/catalogos/distritos/${id}`, { headers: this.getHeaders() });
  }

  getMunicipios(distritoId?: number | null): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/catalogos/municipios`, {
      headers: this.getHeaders(),
      params: this.toParams({ distrito_id: distritoId }),
    });
  }

  getMunicipio(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/catalogos/municipios/${id}`, { headers: this.getHeaders() });
  }

  getLocalidades(filtros: { clave_edo?: number; clave_mun?: number; limit?: number; offset?: number }): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/catalogos/localidades`, {
      headers: this.getHeaders(),
      params: this.toParams(filtros),
    });
  }

  listarSolicitudes(filtros: { estado?: string; buscador_id?: number; limit?: number; offset?: number }): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/solicitudes`, {
      headers: this.getHeaders(),
      params: this.toParams(filtros),
    });
  }

  getSolicitudPorId(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/solicitudes/${id}`, { headers: this.getHeaders() });
  }

  getHistorial(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/solicitudes/${id}/historial`, { headers: this.getHeaders() });
  }

  getComentarios(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/solicitudes/${id}/comentarios`, { headers: this.getHeaders() });
  }

  agregarComentario(id: number, comentario: string, areaId?: number): Observable<any> {
    const body: any = { comentario };
    if (areaId) body.area_id = areaId;
    return this.http.post<any>(`${this.baseUrl}/solicitudes/${id}/comentarios`, body, { headers: this.getHeaders() });
  }

  getHojaValorada(solicitudId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/solicitudes/${solicitudId}/hoja-valorada`, { headers: this.getHeaders() });
  }

  asignarHojaValorada(solicitudId: number, folio: number, observaciones = ''): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/solicitudes/${solicitudId}/hoja-valorada`,
      { folio, observaciones },
      { headers: this.getHeaders() }
    );
  }

  anularHojaValorada(folioSolicitud: string, motivo: string): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/solicitudes/${folioSolicitud}/hoja-valorada/anular`,
      { motivo },
      { headers: this.getHeaders() }
    );
  }

  liberarHojaValorada(folioSolicitud: string): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/solicitudes/${folioSolicitud}/hoja-valorada/liberar`,
      {},
      { headers: this.getHeaders() }
    );
  }

  getLotesHojas(limit = 20, offset = 0): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/hojas-valoradas/lotes`, {
      headers: this.getHeaders(),
      params: this.toParams({ limit, offset }),
    });
  }

  crearLoteHojas(lote: { folio_inicio: number; folio_fin: number; fecha_recepcion: string; observaciones?: string }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/hojas-valoradas/lotes`, lote, { headers: this.getHeaders() });
  }

  getResumenHojas(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/hojas-valoradas/resumen`, { headers: this.getHeaders() });
  }

  listarHojasValoradas(filtros: {
    estado?: string;
    inventario_id?: number;
    fecha_desde?: string;
    fecha_hasta?: string;
    limit?: number;
    offset?: number;
  }): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/hojas-valoradas`, {
      headers: this.getHeaders(),
      params: this.toParams(filtros),
    });
  }

  buscarRegistrosNacimiento(filtros: BusquedaNacimiento): Observable<ApiResp<RegistroNacimiento[]>> {
    return this.http.get<ApiResp<RegistroNacimiento[]>>(`${this.baseUrl}/registros-nacimiento`, {
      headers: this.getHeaders(),
      params: this.toParams(filtros as Record<string, any>),
    });
  }

  getRegistroNacimiento(id: number): Observable<ApiResp<RegistroNacimiento>> {
    return this.http.get<ApiResp<RegistroNacimiento>>(`${this.baseUrl}/registros-nacimiento/${id}`, {
      headers: this.getHeaders(),
    });
  }

  crearRegistroNacimiento(registro: Partial<RegistroNacimiento>): Observable<ApiResp<RegistroNacimiento>> {
    return this.http.post<ApiResp<RegistroNacimiento>>(`${this.baseUrl}/registros-nacimiento`, registro, {
      headers: this.getHeaders(),
    });
  }

  actualizarRegistroNacimiento(id: number, registro: Partial<RegistroNacimiento>): Observable<ApiResp<RegistroNacimiento>> {
    return this.http.put<ApiResp<RegistroNacimiento>>(`${this.baseUrl}/registros-nacimiento/${id}`, registro, {
      headers: this.getHeaders(),
    });
  }

  eliminarRegistroNacimiento(id: number): Observable<ApiResp<{ eliminado: boolean }>> {
    return this.http.delete<ApiResp<{ eliminado: boolean }>>(`${this.baseUrl}/registros-nacimiento/${id}`, {
      headers: this.getHeaders(),
    });
  }
}

export interface ApiResp<T> {
  ok: boolean;
  data: T;
  error?: { code: string; message: string };
  meta?: { total: number; limit: number; offset: number };
}

export interface BusquedaNacimiento {
  curp?: string;
  id_satys?: number;
  nombre?: string;
  apellido_paterno?: string;
  apellido_materno?: string;
  numero_acta?: number;
  anio_registro?: number;
  oficialia?: number;
  estado_registro_historico_id?: number;
  municipio?: string;
  fecha_registro?: string;
  nombre_padre?: string;
  apellido_paterno_padre?: string;
  apellido_materno_padre?: string;
  nombre_madre?: string;
  apellido_paterno_madre?: string;
  apellido_materno_madre?: string;
  fecha_nacimiento?: string;
  limit?: number;
  offset?: number;
}

export interface RegistroNacimiento {
  id: number;
  origen: string | null;
  id_satys: number | null;
  curp: string | null;
  crip_ed: string | null;
  estado_registro_historico_id: number | null;
  estado_registro_historico_texto: string | null;
  municipio_registro_historico_id: number | null;
  municipio_registro_historico_texto: string | null;
  distrito_registro_historico_id: number | null;
  distrito_registro_historico_texto: string | null;
  oficialia: number | null;
  localidad_registro_historica_id: number | null;
  localidad_registro_historica_texto: string | null;
  dia_registro: number | null;
  mes_registro: number | null;
  anio_registro: number | null;
  fecha_registro: string | null;
  numero_acta: number | null;
  numero_acta_original: string | null;
  foja: string | number | null;
  nombre: string;
  apellido_paterno: string | null;
  apellido_materno: string | null;
  sexo: string | null;
  dia_nacimiento: number | null;
  mes_nacimiento: number | null;
  anio_nacimiento: number | null;
  hora_nacimiento: string | null;
  estado_nacimiento_historico_id: number | null;
  estado_nacimiento_historico_texto: string | null;
  municipio_nacimiento_historico_id: number | null;
  municipio_nacimiento_historico_texto: string | null;
  distrito_nacimiento_historico_id: number | null;
  distrito_nacimiento_historico_texto: string | null;
  localidad_nacimiento_historica_id: number | null;
  localidad_nacimiento_historica_texto: string | null;
  estado_vital: string | null;
  nombre_madre: string | null;
  apellido_paterno_madre: string | null;
  apellido_materno_madre: string | null;
  nacionalidad_madre: string | null;
  nacionalidad_madre_texto: string | null;
  edad_madre: number | null;
  nombre_padre: string | null;
  apellido_paterno_padre: string | null;
  apellido_materno_padre: string | null;
  nacionalidad_padre: string | null;
  nacionalidad_padre_texto: string | null;
  edad_padre: number | null;
  presento: string | null;
  nombre_presento: string | null;
  parentesco: string | null;
  edad_presento: number | null;
  estatus_acervo: string | null;
  fecha_migracion: string | null;
}