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
import { OverlayModule, ConnectedPosition } from '@angular/cdk/overlay';
import { FoliosRecientesService } from '../folios-recientes';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatMenuModule, MatDialogModule, OverlayModule],
  template: `
    <div *ngIf="auth.isLoggedIn() && !esLogin()" class="top-bar">
      <span class="saludo">
        <mat-icon>person</mat-icon>
        Bienvenido {{ auth.getNombre() }} &nbsp;·&nbsp; {{ auth.getRol() }}
      </span>

      <div class="acciones-top">
        <button class="btn-salir btn-folios" [class.on]="panelFolios"
                cdkOverlayOrigin #origenFolios="cdkOverlayOrigin"
                (click)="panelFolios = !panelFolios">
          <mat-icon>confirmation_number</mat-icon>
          Folios
          @if (folios.lista().length) {
            <span class="badge">{{ folios.lista().length }}</span>
          }
        </button>

        <button class="btn-salir" [matMenuTriggerFor]="userMenu">
          <mat-icon>manage_accounts</mat-icon>
          Cuenta
          <mat-icon class="chevron">expand_more</mat-icon>
        </button>
      </div>

      <ng-template cdkConnectedOverlay
                   [cdkConnectedOverlayOrigin]="origenFolios"
                   [cdkConnectedOverlayOpen]="panelFolios"
                   [cdkConnectedOverlayPositions]="posicionesFolios"
                   [cdkConnectedOverlayHasBackdrop]="true"
                   cdkConnectedOverlayBackdropClass="cdk-overlay-transparent-backdrop"
                   (backdropClick)="panelFolios = false"
                   (detach)="panelFolios = false">
        <div class="folios-panel">
          <div class="fp-head">
            <mat-icon>confirmation_number</mat-icon>
            <span>Folios generados en esta sesión</span>
          </div>

          <div class="fp-lista">
            @for (f of folios.lista(); track f.folio) {
              <div class="fp-item">
                <div class="fp-top">
                  <strong>{{ f.nombre || 'Sin nombre' }}</strong>
                  <span>{{ f.fecha | date:'HH:mm' }}</span>
                </div>
                <div class="fp-row">
                  <em>Folio</em>
                  <code>{{ f.folio }}</code>
                  <button type="button" class="fp-copy" (click)="folios.copiar(f.folio)" title="Copiar folio">
                    <mat-icon>{{ folios.copiado() === f.folio ? 'check' : 'content_copy' }}</mat-icon>
                  </button>
                </div>
                @if (f.lineaCaptura) {
                  <div class="fp-row">
                    <em>Línea</em>
                    <code>{{ f.lineaCaptura }}</code>
                    <button type="button" class="fp-copy" (click)="folios.copiar(f.lineaCaptura)" title="Copiar línea de captura">
                      <mat-icon>{{ folios.copiado() === f.lineaCaptura ? 'check' : 'content_copy' }}</mat-icon>
                    </button>
                  </div>
                }
                <div class="fp-acciones">
                  @if (f.urlPdf) {
                    <a [href]="f.urlPdf" target="_blank" rel="noopener">
                      <mat-icon>picture_as_pdf</mat-icon> Hoja de pago
                    </a>
                  }
                  <button type="button" (click)="folios.quitar(f.folio)">
                    <mat-icon>close</mat-icon> Quitar
                  </button>
                </div>
              </div>
            } @empty {
              <div class="fp-vacio">Aún no has generado hojas de pago en esta sesión.</div>
            }
          </div>

          @if (folios.lista().length) {
            <div class="fp-pie">
              <button type="button" (click)="folios.limpiar()">Limpiar lista</button>
            </div>
          }
        </div>
      </ng-template>

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
  panelFolios  = false;

  readonly posicionesFolios: ConnectedPosition[] = [
    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 6 },
  ];
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
    public  folios: FoliosRecientesService,
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
  ) {}

  esLogin(): boolean {
    return this.router.url === '/login';
  }

  logout() {
    this.panelFolios = false;
    this.folios.limpiar();
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