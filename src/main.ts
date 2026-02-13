import { bootstrapApplication } from '@angular/platform-browser';
import { importProvidersFrom } from '@angular/core';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app/app';
import { TokenInt } from './app/tokenint-interceptor';
import { routes } from './app/app.routes';

export const appConfig = {
  providers: [
    importProvidersFrom(HttpClientModule),
    provideRouter(routes),  
    {
      provide: HTTP_INTERCEPTORS,
      useClass: TokenInt,
      multi: true,
    }
  ]
};

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));