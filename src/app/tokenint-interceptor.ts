import { Injectable } from '@angular/core';
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class TokenInt implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (req.url.includes('/auth/login')) {
      return next.handle(req);
    }

    const token = localStorage.getItem('token');
    if (token) {
      const clonedRequest = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true' 
        }
      });
      
      return next.handle(clonedRequest).pipe(
        catchError((error) => {
          if (error.status === 401) {
            console.error('Error de autenticación');
          }
          return throwError(() => error);  
        })
      );
    }

    return next.handle(req).pipe(
      catchError((error) => {
        return throwError(() => error);  
      })
    );
  }
}