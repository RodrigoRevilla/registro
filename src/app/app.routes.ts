import { Routes } from '@angular/router';
import { NacimientoComponent } from './nacimiento/nacimiento';
import { ActaDetalleComponent } from './acta-detalle/acta-detalle';
import { HomeComponent } from './home/home';
import { TrabajoComponent } from './trabajo/trabajo';
import { BusquedaComponent } from './busqueda/busqueda';
import { CertificacionComponent } from './certificacion/certificacion';
import { LoginComponent } from './login/login';
import { AuthGuard } from './auth-guard'; 
import { LogoutComponent } from './logout/logout';
import { ModificacionComponent } from './modificacion/modificacion';
import { ConsultaPagoComponent } from './act-pag/act-pag';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' }, 
  { path: 'login', component: LoginComponent },
  { path: 'home', component: HomeComponent, canActivate: [AuthGuard] },
  { path: 'nacimiento', component: NacimientoComponent, canActivate: [AuthGuard] },
  { path: 'acta-detalle/:curp', component: ActaDetalleComponent, canActivate: [AuthGuard] },
  { path: 'trabajo', component: TrabajoComponent, canActivate: [AuthGuard] },
  { path: 'busqueda', component: BusquedaComponent, canActivate: [AuthGuard] },
  { path: 'generar', component: CertificacionComponent, canActivate: [AuthGuard] },
  { path: 'modificacion', component: ModificacionComponent },
  { path: 'actualizar', component: ConsultaPagoComponent, canActivate: [AuthGuard]},
  { path: 'logout', component: LogoutComponent, canActivate: [AuthGuard]},
  { path: '**', redirectTo: '/login' }  
];