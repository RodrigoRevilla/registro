import { Injectable, computed, signal } from '@angular/core';
import { ApiService } from './http';

export interface MunicipioCatalogo {
  id_municipio: number;
  id_distrito: number;
  nombre: string;
}

@Injectable({ providedIn: 'root' })
export class CatalogoMunicipiosService {
  readonly lista = signal<MunicipioCatalogo[]>([]);
  readonly cargado = signal(false);

  private readonly porId = computed(() => {
    const mapa = new Map<number, MunicipioCatalogo>();
    for (const m of this.lista()) mapa.set(Number(m.id_municipio), m);
    return mapa;
  });

  private pidiendo = false;

  constructor(private api: ApiService) {}

  cargar(): void {
    if (this.cargado() || this.pidiendo) return;
    this.pidiendo = true;
    this.api.getMunicipios().subscribe({
      next: resp => {
        this.lista.set(resp?.data ?? []);
        this.cargado.set(true);
        this.pidiendo = false;
      },
      error: () => { this.pidiendo = false; },
    });
  }

  buscar(id: number | string | null | undefined): MunicipioCatalogo | null {
    const n = parseInt(`${id ?? ''}`.trim(), 10);
    if (isNaN(n)) return null;
    return this.porId().get(n) ?? null;
  }

  nombre(id: number | string | null | undefined): string {
    return this.buscar(id)?.nombre ?? '';
  }
}