import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from './auth';
import { Observable, throwError } from 'rxjs';
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
    return this.http.get(`${this.baseUrl}/api/v1/solicitudes/folio/${folio}`);
  }

  getSolicitudPorFolio(folio: string): Observable<any> {
    return this.http
      .get<any>(`${this.baseUrl}/solicitudes/folio/${folio}`, { headers: this.getHeaders() })
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
      .get<any>(`${this.baseUrl}/solicitudes/${id}/pago`, { headers: this.getHeaders() })
      .pipe(catchError((error) => throwError(() => error)));
  }

  confirmarPago(payload: { referencia_pago: string }): Observable<any> {
    return this.http
      .post<any>(`${this.baseUrl}/pagos/confirmacion`, payload, { headers: { 'Content-Type': 'application/json' } })
      .pipe(catchError((error) => throwError(() => error)));
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
}
