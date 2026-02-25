import { Component, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../auth';

interface Usuario {
  id: number;
  username: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string | null;
  area_id: number;
  rol_id: number;
  rol: { id: number; clave: string; nombre: string };
  activo: boolean;
}

interface Area {
  id: number;
  clave: string;
  nombre: string;
}

interface Rol {
  id: number;
  clave: string;
  nombre: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinner,
    MatMenuModule,
    MatDialogModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTooltipModule,
    MatDividerModule,
  ],
  templateUrl: './home.html',
  styleUrls: ['./home.scss'],
})
export class HomeComponent implements OnInit {

  private readonly API = '/api/v1';

  isLoggedIn  = false;
  esAdmin     = false;
  vistaActual: 'home' | 'usuarios' = 'home';
  usuarios:   Usuario[] = [];
  roles:      Rol[]     = [];
  areas:      Area[]    = [];
  cargando    = false;  

  mostrarFormNuevo = false;
  nuevoUsuario = {
    username: '', password: '', nombre: '',
    apellido_paterno: '', apellido_materno: '',
    area_id: 1, rol_id: 1,
  };

  guardandoNuevo = false;
  editandoPasswordId: number | null = null;
  nuevaPassword = '';
  guardandoPassword = false;
  editandoRolId: number | null = null;
  nuevoRolId: number | null = null;
  guardandoRol = false;
  usuarioEditando: Usuario | null = null;

  private get headers(): HttpHeaders {
    const token = sessionStorage.getItem('token') ?? '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  constructor(
    private router:      Router,
    private http:        HttpClient,
    public  authService: AuthService,
    private ngZone:      NgZone,
    private cdr:         ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.isLoggedIn = this.authService.isLoggedIn();
    if (!this.isLoggedIn) { this.router.navigate(['/login']); return; }
    const rol = this.authService.getRol()?.toUpperCase() ?? '';
    this.esAdmin = rol.includes('ADMIN');
  }

  irAGestionUsuarios(): void {
    this.vistaActual      = 'usuarios';
    this.usuarios         = [];
    this.cargando         = true;
    this.mostrarFormNuevo = false;
    this.cdr.detectChanges();  
    this.cargarDatosUsuarios();
  }

  volverAHome(): void {
    this.vistaActual        = 'home';
    this.mostrarFormNuevo   = false;
    this.editandoPasswordId = null;
    this.editandoRolId      = null;
    this.cargando           = false;  
  }

  logout(): void { this.authService.logout(); this.router.navigate(['/login']); }

  irANacimiento(event: MouseEvent)  { event?.stopImmediatePropagation(); this.router.navigate(['/nacimiento']); }
  irATrabajo(event: MouseEvent)     { event?.stopImmediatePropagation(); this.router.navigate(['/trabajo']); }
  irAModificacion(event: Event)     { event.stopPropagation(); this.router.navigate(['/modificacion']); }
  irAActualizarPago(event: Event)   { event.preventDefault(); this.router.navigate(['/actualizar']); }
  irAImpresiones(event: Event)      { event.preventDefault(); this.router.navigate(['/impresiones']); }

  cargarDatosUsuarios(): void {
    this.cargarUsuarios();
    this.cargarAreas();
  }

  cargarUsuarios(): void {
    this.cargando = true;
    this.cdr.detectChanges();  

    this.http.get<any>(`${this.API}/usuarios?limit=100`, { headers: this.headers })
      .subscribe({
        next: resp => {
          this.usuarios = resp?.data ?? [];
          this.cargarRoles();
          this.cargando = false;
          this.cdr.detectChanges();   
        },
        error: (err) => {
          console.error('[home] cargarUsuarios ERROR:', err?.status, err?.error);
          this.cargando = false;
          this.cdr.detectChanges();
        }
      });
  }

  cargarRoles(): void {
    const rolesMap = new Map<number, Rol>();
    this.usuarios.forEach(u => {
      if (u.rol && !rolesMap.has(u.rol.id)) {
        rolesMap.set(u.rol.id, { id: u.rol.id, clave: u.rol.clave, nombre: u.rol.nombre });
      }
    });
    this.roles = Array.from(rolesMap.values());
  }

  cargarAreas(): void {
    this.http.get<any>(`${this.API}/catalogos/areas`, { headers: this.headers })
      .subscribe({
        next: resp => {
          this.areas = resp?.data ?? [];
          this.cdr.detectChanges();
        },
        error: () => {}
      });
  }

  abrirFormNuevo(): void {
    this.mostrarFormNuevo = true;
    this.nuevoUsuario = {
      username: '', password: '', nombre: '',
      apellido_paterno: '', apellido_materno: '',
      area_id: this.areas[0]?.id ?? 1,
      rol_id:  this.roles[0]?.id ?? 1,
    };
  }

  cancelarNuevo(): void { this.mostrarFormNuevo = false; }

  guardarNuevo(): void {
    const u = this.nuevoUsuario;
    if (!u.username || !u.password || !u.nombre || !u.apellido_paterno) {
      alert('Completa los campos obligatorios'); return;
    }
    if (u.password.length < 8) { alert('La contraseña debe tener al menos 8 caracteres'); return; }

    this.guardandoNuevo = true;
    this.http.post<any>(`${this.API}/usuarios`, u, { headers: this.headers })
      .subscribe({
        next: resp => {
          this.guardandoNuevo   = false;
          this.mostrarFormNuevo = false;
          if (resp?.ok) { this.cargarUsuarios(); }
          else { alert('Error al crear usuario'); }
        },
        error: err => {
          this.guardandoNuevo = false;
          const code = err?.error?.error?.code;
          alert(code === 'USERNAME_DUPLICADO'
            ? 'Ese username ya existe'
            : err?.error?.error?.message ?? 'Error');
        }
      });
  }

  abrirEditPassword(id: number): void {
    this.editandoPasswordId = id;
    this.nuevaPassword      = '';
    this.editandoRolId      = null;
  }

  cancelarPassword(): void { this.editandoPasswordId = null; this.nuevaPassword = ''; }

  guardarPassword(id: number): void {
    if (!this.nuevaPassword || this.nuevaPassword.length < 8) {
      alert('La contraseña debe tener al menos 8 caracteres'); return;
    }
    this.guardandoPassword = true;
    this.http.patch<any>(
      `${this.API}/usuarios/${id}/password`,
      { password_nueva: this.nuevaPassword },
      { headers: this.headers }
    ).subscribe({
      next: () => {
        this.guardandoPassword  = false;
        this.editandoPasswordId = null;
        this.nuevaPassword      = '';
        alert('Contraseña actualizada');
      },
      error: err => {
        this.guardandoPassword = false;
        alert(err?.error?.error?.message ?? 'Error al cambiar contraseña');
      }
    });
  }

  abrirEditRol(usuario: Usuario): void {
    this.editandoRolId      = usuario.id;
    this.nuevoRolId         = usuario.rol_id;
    this.editandoPasswordId = null;
    this.usuarioEditando    = usuario;
  }

  cancelarRol(): void { this.editandoRolId = null; this.nuevoRolId = null; }

  guardarRol(usuario: Usuario): void {
    if (!this.nuevoRolId) { alert('Selecciona un rol'); return; }
    this.guardandoRol = true;
    const body = {
      nombre:           usuario.nombre,
      apellido_paterno: usuario.apellido_paterno,
      apellido_materno: usuario.apellido_materno ?? undefined,
      area_id:          usuario.area_id,
      rol_id:           this.nuevoRolId,
    };
    this.http.put<any>(
      `${this.API}/usuarios/${usuario.id}`,
      body,
      { headers: this.headers }
    ).subscribe({
      next: resp => {
        this.guardandoRol  = false;
        this.editandoRolId = null;
        if (resp?.ok) { this.cargarUsuarios(); }
        else { alert('Error al actualizar rol'); }
      },
      error: err => {
        this.guardandoRol = false;
        alert(err?.error?.error?.message ?? 'Error al cambiar rol');
      }
    });
  }

  toggleActivo(usuario: Usuario): void {
    const accion = usuario.activo ? 'desactivar' : 'activar';
    if (!confirm(`¿Seguro que deseas ${accion} a ${usuario.nombre}?`)) return;

    this.http.patch<any>(
      `${this.API}/usuarios/${usuario.id}/toggle-activo`,
      {},
      { headers: this.headers }
    ).subscribe({
      next: () => { this.cargarUsuarios(); },
      error: err => { alert(err?.error?.error?.message ?? 'Error'); }
    });
  }

  nombreCompleto(u: Usuario): string {
    return [u.nombre, u.apellido_paterno, u.apellido_materno].filter(Boolean).join(' ');
  }
}