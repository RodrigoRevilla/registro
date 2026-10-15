import { Injectable, Inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface HojaGenerada {
  folio: string;
  lineaCaptura: string;
  nombre: string;
  urlPdf: string;
}

export function leerHojaGenerada(): HojaGenerada | null {
  if (typeof history === 'undefined') return null;
  const h = history.state?.hojaGenerada;
  return h && h.folio ? h : null;
}

export interface FolioReciente {
  folio: string;
  lineaCaptura: string;
  nombre: string;
  urlPdf: string;
  fecha: string;
}

@Injectable({
  providedIn: 'root',
})
export class FoliosRecientesService {
  private readonly clave = 'foliosRecientes';
  private readonly maximo = 15;

  readonly lista = signal<FolioReciente[]>([]);
  readonly copiado = signal('');

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      try {
        const guardado = sessionStorage.getItem(this.clave);
        if (guardado) this.lista.set(JSON.parse(guardado));
      } catch {
        this.lista.set([]);
      }
    }
  }

  agregar(item: Omit<FolioReciente, 'fecha'>): void {
    if (!item.folio) return;
    const nuevo: FolioReciente = { ...item, fecha: new Date().toISOString() };
    this.lista.update(l => [nuevo, ...l.filter(x => x.folio !== item.folio)].slice(0, this.maximo));
    this.guardar();
  }

  quitar(folio: string): void {
    this.lista.update(l => l.filter(x => x.folio !== folio));
    this.guardar();
  }

  limpiar(): void {
    this.lista.set([]);
    this.guardar();
  }

  copiar(texto: string): void {
    if (!texto || !isPlatformBrowser(this.platformId)) return;
    const marcar = () => {
      this.copiado.set(texto);
      setTimeout(() => {
        if (this.copiado() === texto) this.copiado.set('');
      }, 1500);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(texto).then(marcar, () => {
        if (this.copiarConRespaldo(texto)) marcar();
      });
      return;
    }
    if (this.copiarConRespaldo(texto)) marcar();
  }

  private copiarConRespaldo(texto: string): boolean {
    const area = document.createElement('textarea');
    area.value = texto;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '0';
    area.style.left = '0';
    area.style.opacity = '0';
    const activo = document.activeElement as HTMLElement | null;
    const contenedor = activo?.closest('.cdk-overlay-container, .mat-mdc-dialog-surface') ?? document.body;
    contenedor.appendChild(area);
    area.focus();
    area.select();
    area.setSelectionRange(0, texto.length);
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    area.remove();
    activo?.focus?.();
    return ok;
  }

  private guardar(): void {
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.setItem(this.clave, JSON.stringify(this.lista()));
    }
  }
}