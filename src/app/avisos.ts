import { Component, Injectable, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

export type TipoAviso = 'error' | 'exito' | 'aviso';

export interface Aviso {
  id: number;
  tipo: TipoAviso;
  texto: string;
}

@Injectable({ providedIn: 'root' })
export class AvisosService {
  private siguienteId = 1;
  readonly lista = signal<Aviso[]>([]);

  error(texto: string): void {
    this.mostrar('error', texto, 8000);
  }

  exito(texto: string): void {
    this.mostrar('exito', texto, 4500);
  }

  aviso(texto: string): void {
    this.mostrar('aviso', texto, 7000);
  }

  quitar(id: number): void {
    this.lista.update(l => l.filter(a => a.id !== id));
  }

  private mostrar(tipo: TipoAviso, texto: string, duracion: number): void {
    if (!texto) return;
    const repetido = this.lista().find(a => a.texto === texto && a.tipo === tipo);
    if (repetido) this.quitar(repetido.id);
    const id = this.siguienteId++;
    this.lista.update(l => [...l.slice(-3), { id, tipo, texto }]);
    setTimeout(() => this.quitar(id), duracion);
  }
}

@Component({
  selector: 'app-avisos',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="avisos" aria-live="polite">
      @for (a of avisos.lista(); track a.id) {
        <div class="aviso" [class]="'aviso aviso-' + a.tipo" [attr.role]="a.tipo === 'error' ? 'alert' : 'status'">
          <mat-icon>{{ a.tipo === 'exito' ? 'check_circle' : a.tipo === 'aviso' ? 'warning_amber' : 'error_outline' }}</mat-icon>
          <span>{{ a.texto }}</span>
          <button type="button" (click)="avisos.quitar(a.id)" aria-label="Cerrar aviso">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .avisos {
      position: fixed;
      top: 64px;
      right: 16px;
      z-index: 3000;
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: min(420px, calc(100vw - 32px));
      pointer-events: none;
    }

    .aviso {
      pointer-events: auto;
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px 10px 10px 12px;
      border-radius: 6px;
      border: 1px solid;
      border-left-width: 4px;
      background: #fff;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
      font-family: 'Inter', system-ui, sans-serif;
      font-size: 14px;
      font-weight: 500;
      line-height: 1.4;
      color: #1f1f1f;
      animation: entrar 0.18s ease-out;

      > mat-icon { flex-shrink: 0; font-size: 20px; width: 20px; height: 20px; margin-top: 1px; }
      span { flex: 1; overflow-wrap: anywhere; }

      button {
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        min-height: 0;
        padding: 0;
        border: none;
        border-radius: 4px;
        background: transparent;
        color: #555;
        cursor: pointer;

        mat-icon { font-size: 16px; width: 16px; height: 16px; }
        &:hover { background: rgba(0, 0, 0, 0.06); }
      }
    }

    .aviso-error { border-color: rgba(179, 38, 30, 0.35); border-left-color: #b3261e; > mat-icon { color: #b3261e; } }
    .aviso-exito { border-color: rgba(46, 125, 50, 0.35); border-left-color: #2e7d32; > mat-icon { color: #2e7d32; } }
    .aviso-aviso { border-color: rgba(161, 92, 0, 0.35); border-left-color: #a15c00; > mat-icon { color: #a15c00; } }

    @keyframes entrar {
      from { opacity: 0; transform: translateY(-6px); }
      to { opacity: 1; transform: none; }
    }
  `],
})
export class AvisosComponent {
  readonly avisos = inject(AvisosService);
}