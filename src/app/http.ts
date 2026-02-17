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

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();

    if (!token) {
      throw new Error('Token no disponible. Usuario no autenticado.');
    }

    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }
  crearSolicitud(datos: any): Observable<any> {
    return this.http
      .post<any>(`${this.baseUrl}/solicitudes`, datos, {
        headers: this.getHeaders()
      })
      .pipe(
        catchError((error) => {
          console.error('Error al crear solicitud', error);
          return throwError(() => new Error('Error al crear solicitud'));
        })
      );
  }

  getSolicitud(id: number): Observable<any> {
    return this.http
      .get<any>(`${this.baseUrl}/solicitudes/${id}`, {
        headers: this.getHeaders()
      })
      .pipe(
        catchError((error) => {
          console.error('Error al obtener solicitud', error);
          return throwError(() => new Error('Error al obtener solicitud'));
        })
      );
  }

  getSolicitudPorFolio(folio: string): Observable<any> {
    return this.http
      .get<any>(`${this.baseUrl}/solicitudes/folio/${folio}`, {
        headers: this.getHeaders()
      })
      .pipe(
        catchError((error) => {
          console.error('Error al obtener solicitud por folio', error);
          return throwError(() => new Error('Error al obtener solicitud por folio'));
        })
      );
  }

  cambiarEstado(id: number, estado: string, comentario: string): Observable<any> {
    const body = {
      estado_destino_clave: estado,
      comentario: comentario
    };

    return this.http
      .post<any>(`${this.baseUrl}/solicitudes/${id}/cambio-estado`, body, {
        headers: this.getHeaders()
      })
      .pipe(
        catchError((error) => {
          console.error('Error al cambiar estado', error);
          return throwError(() => new Error('Error al cambiar estado'));
        })
      );
  }

  registrarImpresion(id: number, folio: string): Observable<any> {
    const body = {
      folio_hoja_valorada: folio
    };

    return this.http
      .post<any>(`${this.baseUrl}/solicitudes/${id}/impresion`, body, {
        headers: this.getHeaders()
      })
      .pipe(
        catchError((error) => {
          console.error('Error al registrar impresión', error);
          return throwError(() => new Error('Error al registrar impresión'));
        })
      );
  }


  getPago(id: number): Observable<any> {
    return this.http
      .get<any>(`${this.baseUrl}/solicitudes/${id}/pago`, {
        headers: this.getHeaders()
      })
      .pipe(
        catchError((error) => {
          console.error('Error al obtener pago', error);
          return throwError(() => new Error('Error al obtener pago'));
        })
      );
  }

  getActosRegistrales(): Observable<any> {
    return this.http
      .get<any>(`${this.baseUrl}/catalogos/actos-registrales`, {
        headers: this.getHeaders()
      })
      .pipe(
        catchError((error) => {
          console.error('Error al obtener actos registrales', error);
          return throwError(() => new Error('Error al obtener actos registrales'));
        })
      );
  }

}
