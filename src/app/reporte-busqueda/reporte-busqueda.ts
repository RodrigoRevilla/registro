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
      let observaciones = '';

      try {
        const respCom = await firstValueFrom(
          this.http.get<any>(`${this.API}/solicitudes/${d.id}/comentarios`, { headers: this.headers })
        );
        if (respCom?.ok && respCom.data?.length) {
          observaciones = respCom.data.map((c: any) => c.comentario).join(' | ');
        }
      } catch {}

      let fechaPago = '';
      try {
        const respPago = await firstValueFrom(
          this.http.get<any>(`${this.API}/solicitudes/${d.id}/pago`, { headers: this.headers })
        );
        if (respPago?.ok && respPago.data?.fecha_confirmacion) {
          fechaPago = new Date(respPago.data.fecha_confirmacion).toLocaleDateString('es-MX', {
            day: '2-digit', month: 'short', year: 'numeric'
          }).toUpperCase();
        }
      } catch {}

      const rb = d.resultado_busqueda ? this.parsearResultado(d.resultado_busqueda) : {};

      return {
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
                               ? new Date(d.fecha_recepcion).toLocaleDateString('es-MX', { day:'2-digit', month:'2-digit', year:'numeric' })
                               : '',
        fechaPago,
        fechaEntrega:        d.fecha_entrega_resultado
                               ? new Date(d.fecha_entrega_resultado).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' }).toUpperCase()
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
    line('SERVICIO',          datos.servicio,    lm + 90, 'NACIMIENTO', datos.tipoActa);
    line('AÑOS DE BUSQUEDA',  datos.aniosBusqueda);
    line('RANGO DE BUSQUEDA', datos.rangoBusqueda);
    y += 1;
    center('DATOS DEL ACTA');
    y -= 1;

    line('OFICIALIA',          datos.oficialia,    lm + 90, 'AÑO', datos.anio);
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

  async generarReporte(folios: string[]): Promise<void> {
    console.log(`[reporte] Generando para ${folios.length} solicitudes...`);
    const resultados = await Promise.all(folios.map(f => this.obtenerDatos(f)));
    const datos = resultados.filter((d): d is DatosSolicitud => d !== null);

    if (!datos.length) {
      alert('No se pudieron obtener datos para generar el reporte');
      return;
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
  }
}