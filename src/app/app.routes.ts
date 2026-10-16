import { Routes } from '@angular/router';
import { NacimientoComponent }    from './nacimiento/nacimiento';
import { ActaDetalleComponent }   from './acta-detalle/acta-detalle';
import { HomeComponent }          from './home/home';
import { TrabajoComponent }       from './trabajo/trabajo';
import { CertificacionComponent } from './certificacion/certificacion';
import { LoginComponent }         from './login/login';
import { AuthGuard }              from './auth-guard';
import { LogoutComponent }        from './logout/logout';
import { ModificacionComponent }  from './modificacion/modificacion';
import { ConsultaPagoComponent }  from './act-pag/act-pag';
import { MatrimoniosComponent } from './matrimonios/matrimonios';
import { MatrimonioSolicitudComponent } from './matrimonio-solicitud/matrimonio-solicitud';
import { DefuncionesComponent } from './defunciones/defunciones';
import { DefuncionSolicitudComponent } from './defuncion-solicitud/defuncion-solicitud';
import { ReconocimientosComponent } from './reconocimientos/reconocimientos';
import { ReconocimientoSolicitudComponent } from './reconocimiento-solicitud/reconocimiento-solicitud';

export const routes: Routes = [
  { path: '',       redirectTo: '/login', pathMatch: 'full' },
  { path: 'login',  component: LoginComponent },
  { path: 'logout', component: LogoutComponent },
  { path: 'home',               component: HomeComponent,          canActivate: [AuthGuard] },
  { path: 'nacimiento',            component: NacimientoComponent,          canActivate: [AuthGuard], data: { modulo: 'atencion' } },
  { path: 'acta-detalle/:curp',    component: ActaDetalleComponent,         canActivate: [AuthGuard], data: { modulo: 'atencion' } },
  { path: 'generar',               component: CertificacionComponent,       canActivate: [AuthGuard], data: { modulo: 'atencion' } },
  { path: 'matrimonios',           component: MatrimoniosComponent,         canActivate: [AuthGuard], data: { modulo: 'atencion' } },
  { path: 'matrimonios/solicitud', component: MatrimonioSolicitudComponent, canActivate: [AuthGuard], data: { modulo: 'atencion' } },
  { path: 'defunciones',           component: DefuncionesComponent,         canActivate: [AuthGuard], data: { modulo: 'atencion' } },
  { path: 'defunciones/solicitud', component: DefuncionSolicitudComponent,  canActivate: [AuthGuard], data: { modulo: 'atencion' } },
  { path: 'reconocimientos',           component: ReconocimientosComponent,         canActivate: [AuthGuard], data: { modulo: 'atencion' } },
  { path: 'reconocimientos/solicitud', component: ReconocimientoSolicitudComponent, canActivate: [AuthGuard], data: { modulo: 'atencion' } },
  { path: 'trabajo',               component: TrabajoComponent,             canActivate: [AuthGuard], data: { modulo: 'buscadores' } },
  { path: 'modificacion',          component: ModificacionComponent,        canActivate: [AuthGuard], data: { modulo: 'buscadores' } },
  { path: 'actualizar',            component: ConsultaPagoComponent,        canActivate: [AuthGuard], data: { modulo: 'pagos' } },

  { path: '**', redirectTo: '/login' },
];