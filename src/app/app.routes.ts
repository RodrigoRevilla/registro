import { Routes } from '@angular/router';
import { NacimientoComponent } from './nacimiento/nacimiento';
import { ActaDetalleComponent } from './acta-detalle/acta-detalle';

export const routes: Routes = [
  { path: '', component: NacimientoComponent },
  { path: 'acta-detalle/:curp', component: ActaDetalleComponent },
  { path: '**', redirectTo: '', pathMatch: 'full' }
];
