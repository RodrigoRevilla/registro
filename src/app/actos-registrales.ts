import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root' 
})
export class ActosRegistralesService {

  private apiUrl = 'http://localhost:8080/api/v1/catalogos/actos-registrales';  

  constructor(private http: HttpClient) {}

  getActosRegistrales(token: string): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`); 
    return this.http.get<any>(this.apiUrl, { headers });
  }
}
