import { Injectable, Inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

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
    navigator.clipboard.writeText(texto);
    this.copiado.set(texto);
    setTimeout(() => {
      if (this.copiado() === texto) this.copiado.set('');
    }, 1500);
  }

  private guardar(): void {
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.setItem(this.clave, JSON.stringify(this.lista()));
    }
  }
}