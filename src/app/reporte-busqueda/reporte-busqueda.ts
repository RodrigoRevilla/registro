import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import jsPDF from 'jspdf';

interface DatosSolicitud {
  _id: number;
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

const SK_FOLIO_ACTUAL = 'hv_folio_actual';
const SK_FOLIO_USADOS = 'hv_folios_usados';
const SK_BLOQUEADO    = 'hv_bloqueado';

@Injectable({ providedIn: 'root' })
export class ReporteBusquedaService {

  private readonly API = '/api/v1';

  constructor(private http: HttpClient) {}

  private get headers(): HttpHeaders {
    const token = sessionStorage.getItem('token') ?? '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private leerFolioActual(): number | null {
    const raw = sessionStorage.getItem(SK_FOLIO_ACTUAL);
    const n   = raw ? parseInt(raw, 10) : NaN;
    return !isNaN(n) && n > 0 ? n : null;
  }

  private leerUsados(): Set<number> {
    try {
      const raw = sessionStorage.getItem(SK_FOLIO_USADOS);
      return raw ? new Set<number>(JSON.parse(raw)) : new Set<number>();
    } catch { return new Set<number>(); }
  }

  private marcarUsado(folio: number): void {
    const usados = this.leerUsados();
    usados.add(folio);
    sessionStorage.setItem(SK_FOLIO_USADOS, JSON.stringify([...usados]));
    console.log(`[HV] Folio ${folio} marcado como usado | usados en sesión:`, [...usados]);
  }

  private siguienteLibre(desde: number): number {
    const usados = this.leerUsados();
    while (usados.has(desde)) { desde++; }
    return desde;
  }

  private avanzarFolio(folioUsado: number): number {
    const siguiente = this.siguienteLibre(folioUsado + 1);
    sessionStorage.setItem(SK_FOLIO_ACTUAL, String(siguiente));
    console.log(`[HV] Autoincremento: ${folioUsado} → ${siguiente} | sessionStorage[${SK_FOLIO_ACTUAL}]="${siguiente}"`);
    return siguiente;
  }

  private async obtenerDatos(folio: string): Promise<DatosSolicitud | null> {
    try {
      console.log(`[reporte] Obteniendo datos de ${folio}...`);
      const respSol = await firstValueFrom(
        this.http.get<any>(`${this.API}/solicitudes/folio/${folio}`, { headers: this.headers })
      );
      if (!respSol?.ok || !respSol.data) {
        console.warn(`[reporte] No se encontró la solicitud ${folio}`);
        return null;
      }
      const d = respSol.data;
      console.log(`[reporte] Solicitud ${folio} — id: ${d.id}, estado_id: ${d.estado_id}`);

      let observaciones = '';
      try {
        const respCom = await firstValueFrom(
          this.http.get<any>(`${this.API}/solicitudes/${d.id}/comentarios`, { headers: this.headers })
        );
        if (respCom?.ok && respCom.data?.length) {
          observaciones = respCom.data.map((c: any) => c.comentario).join(' | ');
          console.log(`[reporte] ${folio} — ${respCom.data.length} comentario(s)`);
        }
      } catch (e) {
        console.warn(`[reporte] Sin comentarios para ${folio}`);
      }

      let fechaPago = '';
      try {
        const respPago = await firstValueFrom(
          this.http.get<any>(`${this.API}/solicitudes/${d.id}/pago`, { headers: this.headers })
        );
        if (respPago?.ok && respPago.data?.fecha_confirmacion) {
          fechaPago = new Date(respPago.data.fecha_confirmacion).toLocaleDateString('es-MX', {
            day: '2-digit', month: 'short', year: 'numeric'
          }).toUpperCase();
          console.log(`[reporte] ${folio} — fecha pago: ${fechaPago}`);
        } else {
          console.warn(`[reporte] ${folio} sin fecha de confirmación de pago`);
        }
      } catch (e) {
        console.warn(`[reporte] No se pudo obtener pago de ${folio}`);
      }

      const rb = d.resultado_busqueda ? this.parsearResultado(d.resultado_busqueda) : {};

      return {
        _id:                 d.id,
        folio:               d.folio ?? '',
        servicio:            rb['servicio']            ?? '',
        tipoActa:            rb['tipoActa']            ?? 'NACIMIENTO',
        aniosBusqueda:       rb['aniosBusqueda']       ?? '----',
        rangoBusqueda:       rb['rangoBusqueda']       ?? '-----',
        oficialia:           rb['oficialia']           ?? '',
        acta:                rb['acta']                ?? '',
        anio:                rb['anio']                ?? (d.fecha_recepcion ? String(new Date(d.fecha_recepcion).getFullYear()) : ''),
        fechaRegistro:       rb['fechaRegistro']       ?? '0-0-0',
        localidad:           rb['localidad']           ?? '',
        municipio:           rb['municipio']           ?? '',
        distrito:            rb['distrito']            ?? '',
        nombre:              rb['nombre']              ?? '',
        fechaNacimiento:     rb['fechaNacimiento']     ?? '0-0-0',
        lugarNacimiento:     rb['lugarNacimiento']     ?? '',
        padre:               rb['padre']               ?? '',
        madre:               rb['madre']               ?? '',
        copiasSolicitadas:   rb['copiasSolicitadas']   ?? '1',
        documentoPresentado: rb['documentoPresentado'] ?? '',
        fechaSolicitud:      d.fecha_recepcion
          ? new Date(d.fecha_recepcion).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
          : '',
        fechaPago,
        fechaEntrega:        d.fecha_entrega_resultado
          ? new Date(d.fecha_entrega_resultado).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
          : '',
        elaboro:             rb['elaboro']             ?? 'JEFE VENTANILLA',
        observaciones,
        anotaciones:         `PAGO: ${fechaPago}`,
      };
    } catch (err) {
      console.error(`[reporte] Error obteniendo ${folio}:`, err);
      return null;
    }
  }

  private parsearResultado(texto: string): Record<string, string> {
    try {
      return JSON.parse(texto);
    } catch {
      return {};
    }
  }

  private async cambiarAAsignada(solicitudId: number, folio: string, folioHV: number): Promise<void> {
    try {
      console.log(`[reporte] ${folio} (id:${solicitudId}) → ASIGNADA con hoja valorada ${folioHV}...`);
      const resp = await firstValueFrom(
        this.http.post<any>(
          `${this.API}/solicitudes/${solicitudId}/cambio-estado`,
          {
            estado_destino_clave: 'ASIGNADA',
            comentario: `Hoja valorada: ${folioHV}`
          },
          { headers: this.headers }
        )
      );
      if (resp?.ok) {
        console.log(`[reporte] ${folio} → ASIGNADA OK (hoja valorada: ${folioHV})`, resp.data);
      } else {
        console.warn(`[reporte] Respuesta inesperada para ${folio}:`, resp);
      }
    } catch (err: any) {
      console.warn(`[reporte] No se pudo cambiar estado de ${folio}:`,
        err?.error?.error?.message ?? err?.status);
    }
  }

  private dibujarOrden(doc: any, datos: DatosSolicitud, yBase: number): number {
    const lm = 15;
    const pw = 180;
    const fs = 7;
    const lh = 4.5;

    doc.setFontSize(fs);
    doc.setFont('courier', 'normal');

    let y = yBase;

    const line = (label: string, value: string, x2?: number, label2?: string, value2?: string) => {
      doc.setFont('courier', 'normal');
      doc.text(label, lm, y);
      doc.text(`: ${value}`, lm + 38, y);
      if (x2 && label2 !== undefined && value2 !== undefined) {
        doc.text(label2, x2, y);
        doc.text(`: ${value2}`, x2 + 30, y);
      }
      y += lh;
    };

    const center = (texto: string, bold = false) => {
      doc.setFont('courier', bold ? 'bold' : 'normal');
      doc.text(texto, lm + pw / 2, y, { align: 'center' });
      doc.setFont('courier', 'normal');
      y += lh;
    };

    const separator = () => {
      doc.setLineDashPattern([1, 1], 0);
      doc.line(lm, y, lm + pw, y);
      doc.setLineDashPattern([], 0);
      y += lh;
    };

    center('ARCHIVO CENTRAL DEL REGISTRO CIVIL', true);
    center('ORDEN DE BUSQUEDA', true);
    doc.setFont('courier', 'bold');
    doc.text(`FOLIO: ${datos.folio}`, lm + pw, yBase + lh * 0.5, { align: 'right' });
    doc.setFont('courier', 'normal');
    y += 1;
    line('SERVICIO',          datos.servicio,       lm + 90, 'NACIMIENTO', datos.tipoActa);
    line('AÑOS DE BUSQUEDA',  datos.aniosBusqueda);
    line('RANGO DE BUSQUEDA', datos.rangoBusqueda);
    y += 1;
    center('DATOS DEL ACTA');
    y -= 1;
    line('OFICIALIA',          datos.oficialia,      lm + 90, 'AÑO', datos.anio);
    line('ACTA',               datos.acta);
    line('FECHA DE REGISTRO',  datos.fechaRegistro);
    line('LOCALIDAD REGISTRO', `[${datos.localidad}]`);
    line('MUNICIPIO REGISTRO', `[${datos.municipio}]`);
    line('DISTRITO REGISTRO',  `[${datos.distrito}]`);
    y += 1;
    center('DATOS DEL REGISTRADO');
    y -= 1;
    line('NOMBRE',             datos.nombre);
    line('FECHA NACIMIENTO',   datos.fechaNacimiento);
    line('LUGAR NACIMIENTO',   `[] ${datos.lugarNacimiento}`);
    line('PADRE',              datos.padre);
    line('MADRE',              datos.madre);
    line('COPIAS SOLICITADAS', datos.copiasSolicitadas,  lm + 90, 'DOCUMENTO PRESENTADO', datos.documentoPresentado);
    line('FECHA SOLICITUD',    datos.fechaSolicitud,     lm + 90, 'FECHA DE PAGO',         datos.fechaPago);
    line('FECHA ENTREGA',      datos.fechaEntrega);
    line('ELABORO SOLICITUD',  datos.elaboro);
    doc.setFont('courier', 'normal');
    doc.text('OBSERVACIONES', lm, y);
    doc.text(`: ${datos.observaciones}`, lm + 38, y);
    y += lh;
    doc.setFont('courier', 'bold');
    doc.text('ANOTACIONES', lm, y);
    doc.setFont('courier', 'normal');
    doc.text(' :', lm + 24, y);
    y += lh;
    doc.text(datos.anotaciones, lm + 4, y);
    y += lh + 4;
    separator();

    return y;
  }

  async generarReporte(folios: string[]): Promise<Map<string, number>> {
    if (sessionStorage.getItem(SK_BLOQUEADO) !== '1') {
      alert('Es necesario ingresar un folio inicial de hoja valorada antes de generar el reporte.');
      return new Map();
    }

    let folioHVActual = this.leerFolioActual();
    if (!folioHVActual) {
      alert('No se encontró el folio de hoja valorada en sesión. Por favor establécelo nuevamente.');
      return new Map();
    }

    console.log(`[reporte] Generando para ${folios.length} solicitudes...`);
    console.log(`[HV] Folio inicial para este lote: ${folioHVActual}`);

    const resultados = await Promise.all(folios.map(f => this.obtenerDatos(f)));
    const datos = resultados.filter((d): d is DatosSolicitud => d !== null);

    if (!datos.length) {
      alert('No se pudieron obtener datos para generar el reporte');
      return new Map();
    }

    const doc          = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const alturaHoja   = 279;
    const margenTop    = 10;
    const margenBot    = 10;
    const espacioEntre = 4;

    let y = margenTop;

    for (let i = 0; i < datos.length; i++) {
      const yFinal = this.dibujarOrden(doc, datos[i], y);
      if (i + 1 < datos.length) {
        const alturaEstimada = yFinal - y;
        const yProxima       = yFinal + espacioEntre;
        if (yProxima + alturaEstimada > alturaHoja - margenBot) {
          doc.addPage();
          y = margenTop;
        } else {
          y = yProxima;
        }
      }
    }

    console.log(`[reporte] PDF generado con ${datos.length} órdenes`);
    doc.save(`ordenes-busqueda-${new Date().toISOString().slice(0, 10)}.pdf`);
    console.log(`[reporte] Procesando hojas valoradas y estados...`);

    const asignaciones = new Map<string, number>();

    for (const d of datos) {
      folioHVActual = this.siguienteLibre(folioHVActual);
      console.log(`[HV] Asignación: ${d.folio} → hoja valorada ${folioHVActual}`);

      this.marcarUsado(folioHVActual);
      const folioUsado = folioHVActual;
      folioHVActual = this.avanzarFolio(folioUsado);

      asignaciones.set(d.folio, folioUsado);
      await this.cambiarAAsignada(d._id, d.folio, folioUsado);
    }

    console.log(`[reporte] Proceso completo — PDF generado con ${datos.length} órdenes`);
    console.log(`[HV] Siguiente folio disponible tras el lote: ${this.leerFolioActual()}`);
    console.log(`[HV] Resumen de asignaciones:`, Object.fromEntries(asignaciones));

    return asignaciones;
  }
}