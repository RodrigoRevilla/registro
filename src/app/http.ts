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

  cambiarEstado(id: number, estado: string, comentario: string): Observable<any> {
    const token = this.authService.getToken();
    if (!token) {
      console.error('Token no disponible. El usuario no está autenticado.');
      return throwError('Token no disponible. El usuario no está autenticado.');
    }

    const body = { estado_destino_clave: estado, comentario: comentario };
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    });

    return this.http.post<any>(`${this.baseUrl}/solicitudes/${id}/cambio-estado`, body, { headers });
  }

  registrarImpresion(id: number, folio: string): Observable<any> {
    const tokenKey = this.authService.getToken();
    if (!tokenKey) {
      console.error('Token no disponible. El usuario no está autenticado.');
      return throwError('Token no disponible. El usuario no está autenticado.');
    }

    const body = { folio_hoja_valorada: folio };
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenKey}`,
    });

    console.log(`Llamando a la API para registrar impresión para la solicitud con ID: ${id} y folio: ${folio}`);

    return this.http.post<any>(`${this.baseUrl}/solicitudes/${id}/impresion`, body, { headers }).pipe(
      catchError((error) => {
        console.error('Error al registrar impresión', error);
        return throwError('Error al registrar impresión');
      })
    );
  }


  // SOLICITUDES

  crearSolicitud(datos: any): Observable<any> {
    const token = this.authService.getToken();
    if (!token) {
      console.error('Token no disponible. El usuario no está autenticado.');
      return throwError('Token no disponible. El usuario no está autenticado.');
    }

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    });

    return this.http.post<any>(`${this.baseUrl}/solicitudes`, datos, { headers }).pipe(
      catchError((error) => {
        console.error('Error al crear solicitud', error);
        return throwError('Error al crear solicitud');
      })
    );
  }
  // ACTOS REGISTRALES
  getActosRegistrales(): Observable<any> {
    const token = this.authService.getToken();
    if (!token) {
      console.error('Token no disponible. El usuario no está autenticado.');
      return throwError('Token no disponible. El usuario no está autenticado.');
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
    });

    return this.http.get<any>(`${this.baseUrl}/catalogos/actos-registrales`, { headers }).pipe(
      catchError((error) => {
        console.error('Error al obtener actos registrales', error);
        return throwError('Error al obtener actos registrales');
      })
    );
  }
}
