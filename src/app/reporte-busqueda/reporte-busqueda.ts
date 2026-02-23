import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import jsPDF from 'jspdf';

interface DatosSolicitud {
  folio: string;
  servicio: string;
  tipoActa: string;
  aniosBusqueda: string;
  rangoBusqueda: string;
  oficialia: string;
  acta: string;
  anio: string;
  fechaRegistro: string;
  localidad: string;
  municipio: string;
  distrito: string;
  nombre: string;
  fechaNacimiento: string;
  lugarNacimiento: string;
  padre: string;
  madre: string;
  copiasSolicitadas: string;
  documentoPresentado: string;
  fechaSolicitud: string;
  fechaPago: string;
  fechaEntrega: string;
  elaboro: string;
  observaciones: string;
  anotaciones: string;
}

@Injectable({ providedIn: 'root' })
export class ReporteBusquedaService {

  private readonly API = '/api/v1';

  private readonly LAYOUT = {
    margenIzq: 15,
    pageWidth: 180,
    fontSize: 7,
    lineHeight: 4.5,
    margenTop: 10
  };

  constructor(private http: HttpClient) {}

  private get headers(): HttpHeaders {
    const token = sessionStorage.getItem('token') ?? '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private async obtenerDatos(folio: string): Promise<DatosSolicitud | null> {
    try {
      const respSol = await firstValueFrom(
        this.http.get<any>(`${this.API}/solicitudes/folio/${folio}`, { headers: this.headers })
      );

      if (!respSol?.ok || !respSol.data) return null;
      const d = respSol.data;
      const [respCom, respPago] = await Promise.allSettled([
        firstValueFrom(this.http.get<any>(`${this.API}/solicitudes/${d.id}/comentarios`, { headers: this.headers })),
        firstValueFrom(this.http.get<any>(`${this.API}/solicitudes/${d.id}/pago`, { headers: this.headers }))
      ]);

      let observaciones = '';
      let fechaPago = '';

      if (respCom.status === 'fulfilled' && respCom.value?.ok && respCom.value.data?.length) {
        observaciones = respCom.value.data.map((c: any) => c.comentario).join(' | ');
      }

      if (respPago.status === 'fulfilled' && respPago.value?.ok && respPago.value.data?.fecha_confirmacion) {
        fechaPago = new Date(respPago.value.data.fecha_confirmacion)
          .toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
          .toUpperCase();
      }

      const rb = d.resultado_busqueda ? this.parsearResultado(d.resultado_busqueda) : {};

      return {
        folio: d.folio ?? '',
        servicio: rb['servicio'] ?? '',
        tipoActa: rb['tipoActa'] ?? 'NACIMIENTO',
        aniosBusqueda: rb['aniosBusqueda'] ?? '----',
        rangoBusqueda: rb['rangoBusqueda'] ?? '-----',
        oficialia: rb['oficialia'] ?? '',
        acta: rb['acta'] ?? '',
        anio: rb['anio'] ?? '',
        fechaRegistro: rb['fechaRegistro'] ?? '',
        localidad: rb['localidad'] ?? '',
        municipio: rb['municipio'] ?? '',
        distrito: rb['distrito'] ?? '',
        nombre: rb['nombre'] ?? '',
        fechaNacimiento: rb['fechaNacimiento'] ?? '',
        lugarNacimiento: rb['lugarNacimiento'] ?? '',
        padre: rb['padre'] ?? '',
        madre: rb['madre'] ?? '',
        copiasSolicitadas: rb['copiasSolicitadas'] ?? '1',
        documentoPresentado: rb['documentoPresentado'] ?? '',
        fechaSolicitud: d.fecha_recepcion
          ? new Date(d.fecha_recepcion).toLocaleDateString('es-MX')
          : '',
        fechaPago,
        fechaEntrega: d.fecha_entrega_resultado
          ? new Date(d.fecha_entrega_resultado).toLocaleDateString('es-MX')
          : '',
        elaboro: rb['elaboro'] ?? 'JEFE VENTANILLA',
        observaciones,
        anotaciones: `PAGO: ${fechaPago}`
      };

    } catch (err) {
      console.error(err);
      return null;
    }
  }

  private parsearResultado(texto: string): Record<string, string> {
    try { return JSON.parse(texto); }
    catch { return {}; }
  }

  private dibujarTextoMultiLinea(doc: jsPDF, texto: string, x: number, y: number, maxWidth: number): number {
    const { lineHeight } = this.LAYOUT;
    const lineas = doc.splitTextToSize(texto || '', maxWidth);
    doc.text(lineas, x, y);
    return lineas.length * lineHeight;
  }

  private dibujarOrden(doc: jsPDF, datos: DatosSolicitud, yBase: number): number {

    const { margenIzq: lm, pageWidth: pw, fontSize: fs, lineHeight: lh } = this.LAYOUT;

    doc.setFontSize(fs);
    doc.setFont('courier', 'normal');

    let y = yBase;

    const line = (label: string, value: string) => {
      doc.text(label, lm, y);
      const altura = this.dibujarTextoMultiLinea(doc, `: ${value}`, lm + 38, y, 120);
      y += Math.max(lh, altura);
    };

    doc.setFont('courier', 'bold');
    doc.text('ARCHIVO CENTRAL DEL REGISTRO CIVIL', lm + pw / 2, y, { align: 'center' });
    y += lh;
    doc.text('ORDEN DE BUSQUEDA', lm + pw / 2, y, { align: 'center' });
    doc.setFont('courier', 'normal');
    y += lh;

    doc.text(`FOLIO: ${datos.folio}`, lm + pw, yBase + 2, { align: 'right' });

    y += lh;

    line('SERVICIO', datos.servicio);
    line('AÑOS DE BUSQUEDA', datos.aniosBusqueda);
    line('RANGO DE BUSQUEDA', datos.rangoBusqueda);

    y += lh;
    line('NOMBRE', datos.nombre);
    line('PADRE', datos.padre);
    line('MADRE', datos.madre);

    line('OBSERVACIONES', datos.observaciones);
    line('ANOTACIONES', datos.anotaciones);

    doc.setLineDashPattern([1, 1], 0);
    doc.line(lm, y + 2, lm + pw, y + 2);
    doc.setLineDashPattern([], 0);
    return y - yBase + 10;
  }

  async generarReporte(folios: string[]): Promise<void> {

    const resultados = await Promise.all(folios.map(f => this.obtenerDatos(f)));
    const datos = resultados.filter((d): d is DatosSolicitud => d !== null);

    if (!datos.length) {
      alert('No se pudieron obtener datos');
      return;
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });

    const pageHeight = 279;
    let y = this.LAYOUT.margenTop;

    datos.forEach((dato, index) => {
      const altura = this.dibujarOrden(doc, dato, y);
      if (y + altura > pageHeight - 10) {
        doc.addPage();
        y = this.LAYOUT.margenTop;
        this.dibujarOrden(doc, dato, y);
        y += altura;
      } else {
        y += altura;
      }

    });

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.text(`Página ${i} de ${totalPages}`, 200, 275, { align: 'right' });
    }
    doc.save(`ordenes-${new Date().toISOString().slice(0,10)}.pdf`);
  }
}