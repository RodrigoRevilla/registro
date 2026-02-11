import { Routes } from '@angular/router';
import { NacimientoComponent } from './nacimiento/nacimiento';
import { ActaDetalleComponent } from './acta-detalle/acta-detalle';
import { HomeComponent } from './home/home';
import { TrabajoComponent } from './trabajo/trabajo';
import { BusquedaComponent } from './busqueda/busqueda';
import { CertificacionComponent } from './certificacion/certificacion';

export const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  { path: 'nacimiento', component: NacimientoComponent },
  { path: 'acta-detalle/:curp', component: ActaDetalleComponent },
  { path: 'trabajo', component: TrabajoComponent},
  { path: 'busqueda', component: BusquedaComponent },
  { path: 'generar', component: CertificacionComponent },
  { path: '**', redirectTo: '/home' }
];