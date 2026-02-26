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

  isLoggedIn = false;
  esAdmin = false;
  vistaActual: 'home' | 'usuarios' = 'home';
  mostrarPassword = false;

  usuarios: Usuario[] = [];
  roles: Rol[] = [];
  areas: Area[] = [];
  cargando = false;
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
  editandoUsuarioId: number | null = null;
  usuarioEditando: Usuario | null = null;
  editForm = { rol_id: 1, area_id: 1 };
  guardandoEdicion = false;

  private get headers(): HttpHeaders {
    const token = sessionStorage.getItem('token') ?? '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  constructor(
    private router: Router,
    private http: HttpClient,
    public authService: AuthService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
  ) { }

  ngOnInit(): void {
    this.isLoggedIn = this.authService.isLoggedIn();
    if (!this.isLoggedIn) { this.router.navigate(['/login']); return; }
    const rol = this.authService.getRolClave().toUpperCase();
    this.esAdmin = rol.includes('ADMIN');
  }

  irAGestionUsuarios(): void {
    this.vistaActual = 'usuarios';
    this.usuarios = [];
    this.cargando = true;
    this.mostrarFormNuevo = false;
    this.cdr.detectChanges();
    this.cargarDatosUsuarios();
  }

  volverAHome(): void {
    this.vistaActual = 'home';
    this.mostrarFormNuevo = false;
    this.editandoPasswordId = null;
    this.editandoUsuarioId = null;
    this.cargando = false;
  }

  logout(): void { this.authService.logout(); this.router.navigate(['/login']); }

  irANacimiento(event: MouseEvent) { event?.stopImmediatePropagation(); this.router.navigate(['/nacimiento']); }
  irATrabajo(event: MouseEvent) { event?.stopImmediatePropagation(); this.router.navigate(['/trabajo']); }
  irAModificacion(event: Event) { event.stopPropagation(); this.router.navigate(['/modificacion']); }
  irAActualizarPago(event: Event) { event.preventDefault(); this.router.navigate(['/actualizar']); }
  irAImpresiones(event: Event) { event.preventDefault(); this.router.navigate(['/impresiones']); }

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
    this.roles = [
      { id: 1, clave: 'OPERADOR_VENTANILLA', nombre: 'Operador de Ventanilla' },
      { id: 2, clave: 'JEFE_BUSQUEDAS', nombre: 'Jefe de Búsquedas' },
      { id: 4, clave: 'VALIDADOR', nombre: 'Validador' },
      { id: 6, clave: 'ADMINISTRADOR', nombre: 'Administrador' },
    ];
  }

  cargarAreas(): void {
    this.http.get<any>(`${this.API}/catalogos/areas`, { headers: this.headers })
      .subscribe({
        next: resp => {
          this.areas = resp?.data ?? [];
          this.cdr.detectChanges();
        },
        error: () => { }
      });
  }

  abrirFormNuevo(): void {
    this.mostrarFormNuevo = true;
    this.editandoUsuarioId = null;
    this.nuevoUsuario = {
      username: '', password: '', nombre: '',
      apellido_paterno: '', apellido_materno: '',
      area_id: this.areas[0]?.id ?? 1,
      rol_id: this.roles[0]?.id ?? 1,
    };
  }

  cancelarNuevo(): void { this.mostrarFormNuevo = false; }

  guardarNuevo(): void {
    const u = this.nuevoUsuario;
    if (!u.username || !u.password || !u.nombre || !u.apellido_paterno) {
      alert('Completa los campos obligatorios'); return;
    }
    if (u.password.length < 8) {
      alert('La contraseña debe tener al menos 8 caracteres'); return;
    }

    this.guardandoNuevo = true;

    const body: any = {
      username: u.username.trim(),
      password: u.password,
      nombre: u.nombre.trim(),
      apellido_paterno: u.apellido_paterno.trim(),
      area_id: Number(u.area_id),
      rol_id: Number(u.rol_id),
    };

    if (u.apellido_materno?.trim()) {
      body.apellido_materno = u.apellido_materno.trim();
    }

    this.http.post<any>(`${this.API}/usuarios`, body, { headers: this.headers })
      .subscribe({
        next: resp => {
          this.guardandoNuevo = false;
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
    this.nuevaPassword = '';
    this.editandoUsuarioId = null;
  }

  cancelarPassword(): void {
    this.editandoPasswordId = null;
    this.nuevaPassword = '';
    this.mostrarPassword = false; // ← agregar esto
  }

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
        this.guardandoPassword = false;
        this.editandoPasswordId = null;
        this.nuevaPassword = '';
        alert('Contraseña actualizada');
      },
      error: err => {
        this.guardandoPassword = false;
        alert(err?.error?.error?.message ?? 'Error al cambiar contraseña');
      }
    });
  }

  abrirEditUsuario(usuario: Usuario): void {
    this.editandoUsuarioId = usuario.id;
    this.usuarioEditando = usuario;
    this.editandoPasswordId = null;
    this.editForm = {
      rol_id: usuario.rol_id,
      area_id: usuario.area_id,
    };
  }

  cancelarEditUsuario(): void {
    this.editandoUsuarioId = null;
    this.usuarioEditando = null;
  }

  guardarEditUsuario(usuario: Usuario): void {
    if (!this.editForm.rol_id || !this.editForm.area_id) {
      alert('Selecciona rol y área'); return;
    }
    this.guardandoEdicion = true;
    const body: any = {
      nombre: usuario.nombre,
      apellido_paterno: usuario.apellido_paterno,
      area_id: Number(this.editForm.area_id),
      rol_id: Number(this.editForm.rol_id),
    };
    if (usuario.apellido_materno?.trim()) {
      body.apellido_materno = usuario.apellido_materno.trim();
    }

    this.http.put<any>(
      `${this.API}/usuarios/${usuario.id}`,
      body,
      { headers: this.headers }
    ).subscribe({
      next: resp => {
        this.guardandoEdicion = false;
        this.editandoUsuarioId = null;
        if (resp?.ok) { this.cargarUsuarios(); }
        else { alert('Error al actualizar usuario'); }
      },
      error: err => {
        this.guardandoEdicion = false;
        alert(err?.error?.error?.message ?? 'Error al editar usuario');
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

  nombreArea(area_id: number): string {
    return this.areas.find(a => a.id === area_id)?.nombre ?? '—';
  }
}