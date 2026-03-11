import { Component, ChangeDetectorRef } from '@angular/core';
import { AuthService } from '../auth';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatMenuModule, MatDialogModule],
  template: `
    <div *ngIf="auth.isLoggedIn() && !esLogin()" class="top-bar">
      <span class="saludo">
        <mat-icon>person</mat-icon>
        Bienvenido {{ auth.getNombre() }} &nbsp;·&nbsp; {{ auth.getRol() }}
      </span>

      <button class="btn-salir" [matMenuTriggerFor]="userMenu">
        <mat-icon>manage_accounts</mat-icon>
        Cuenta
        <mat-icon class="chevron">expand_more</mat-icon>
      </button>

      <mat-menu #userMenu="matMenu" xPosition="before" class="rc-user-menu">
        <button mat-menu-item (click)="abrirCambioPassword()">
          <mat-icon>lock_reset</mat-icon>
          <span>Cambiar contraseña</span>
        </button>
        <button mat-menu-item (click)="logout()" class="item-salir">
          <mat-icon>logout</mat-icon>
          <span>Cerrar sesión</span>
        </button>
      </mat-menu>
    </div>

    <div *ngIf="modalAbierto" class="pw-overlay" (click)="cerrarModal()">
      <div class="pw-card" (click)="$event.stopPropagation()">

        <div class="pw-header">
          <div class="pw-escudo"><mat-icon>lock_reset</mat-icon></div>
          <div>
            <p class="pw-super">Registro Civil del Estado</p>
            <h2 class="pw-title">Cambiar Contraseña</h2>
          </div>
          <button class="pw-close" (click)="cerrarModal()">✕</button>
        </div>
        <div class="pw-rule"></div>

        <div class="pw-body">
          <div *ngIf="pwError" class="pw-error">
            <mat-icon>warning_amber</mat-icon> {{ pwError }}
          </div>
          <div *ngIf="pwExito" class="pw-exito">
            <mat-icon>check_circle</mat-icon> Contraseña actualizada correctamente
          </div>

          <div class="pw-campo">
            <span class="pw-label">Contraseña actual</span>
            <input class="pw-input" [type]="verActual ? 'text' : 'password'"
              [(ngModel)]="pwActual" placeholder="••••••••" />
            <button class="pw-eye" (click)="verActual = !verActual">
              <mat-icon>{{ verActual ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
          </div>

          <div class="pw-campo">
            <span class="pw-label">Nueva contraseña</span>
            <input class="pw-input" [type]="verNueva ? 'text' : 'password'"
              [(ngModel)]="pwNueva" placeholder="Mínimo 8 caracteres" />
            <button class="pw-eye" (click)="verNueva = !verNueva">
              <mat-icon>{{ verNueva ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
          </div>

          <div class="pw-campo">
            <span class="pw-label">Confirmar contraseña</span>
            <input class="pw-input" [type]="verConfirm ? 'text' : 'password'"
              [(ngModel)]="pwConfirm" placeholder="Repite la nueva contraseña" />
            <button class="pw-eye" (click)="verConfirm = !verConfirm">
              <mat-icon>{{ verConfirm ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
          </div>
        </div>

        <div class="pw-footer">
          <button class="pw-btn-cancelar" (click)="cerrarModal()">Cancelar</button>
          <button class="pw-btn-guardar" (click)="guardarPassword()" [disabled]="guardando">
            <mat-icon>save</mat-icon>
            {{ guardando ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>

      </div>
    </div>
  `,
  styleUrls: ['./header.scss']
})
export class HeaderComponent {

  private readonly API = '/api/v1';

  modalAbierto = false;
  guardando    = false;
  pwActual     = '';
  pwNueva      = '';
  pwConfirm    = '';
  pwError: string | null = null;
  pwExito      = false;
  verActual    = false;
  verNueva     = false;
  verConfirm   = false;

  private get headers(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionStorage.getItem('token') ?? ''}`,
    });
  }

  constructor(
    public  auth: AuthService,
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
  ) {}

  esLogin(): boolean {
    return this.router.url === '/login';
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  abrirCambioPassword(): void {
    this.pwActual  = '';
    this.pwNueva   = '';
    this.pwConfirm = '';
    this.pwError   = null;
    this.pwExito   = false;
    this.guardando = false;
    this.modalAbierto = true;
  }

  cerrarModal(): void {
    if (this.guardando) return;
    this.modalAbierto = false;
  }

  guardarPassword(): void {
    this.pwError = null;
    this.pwExito = false;

    if (!this.pwActual)               { this.pwError = 'Ingresa tu contraseña actual'; return; }
    if (this.pwNueva.length < 8)      { this.pwError = 'La nueva contraseña debe tener al menos 8 caracteres'; return; }
    if (this.pwNueva !== this.pwConfirm) { this.pwError = 'Las contraseñas no coinciden'; return; }

    this.guardando = true;

    const usuario = this.auth.getUsuario();
    if (!usuario?.id) { this.pwError = 'No se pudo identificar al usuario'; this.guardando = false; return; }

    this.http.patch<any>(
      `${this.API}/usuarios/${usuario.id}/password`,
      { password_actual: this.pwActual, password_nueva: this.pwNueva },
      { headers: this.headers }
    ).subscribe({
      next: resp => {
        this.guardando = false;
        if (resp?.ok) {
          this.pwExito = true;
          setTimeout(() => this.cerrarModal(), 1500);
        } else {
          this.pwError = resp?.error?.message ?? 'Error al actualizar la contraseña';
        }
        this.cdr.detectChanges();
      },
      error: err => {
        this.guardando = false;
        this.pwError   = err?.error?.error?.message ?? 'Error al actualizar la contraseña';
        this.cdr.detectChanges();
      }
    });
  }
}