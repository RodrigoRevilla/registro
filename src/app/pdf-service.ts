import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';

export interface DatosPDF {
  tipoRegistro: string;
  nombreRegistrado: string;
  archivoObra: string;
  foja: string;
  acta: string;
  fechaActa: string;
  levantadaEn: string;
  diaDe: string;
  mesDe: string;
  anioDe: string;
  jefa: string;
  encargado: string;
}

const MOCK_DATOS: DatosPDF = {
  tipoRegistro: 'NACIMIENTO',
  nombreRegistrado: 'JUAN PÉREZ LÓPEZ',
  archivoObra: 'EL ARCHIVO CENTRAL DEL REGISTRO CIVIL',
  foja: '11F',
  acta: '91',
  fechaActa: '28 DE JULIO DE 1961',
  levantadaEn: 'MAGDALENA JALTEPEC, NOCHIXTLAN, OAXACA',
  diaDe: '03',
  mesDe: 'JULIO',
  anioDe: '2025',
  jefa: 'C. ANDREA CRUZ SALAZAR, JEFA DEL ARCHIVO CENTRAL DEL REGISTRO CIVIL DEL ESTADO DE OAXACA',
  encargado: 'LIC. CORAL AVEDAÑO MOLINA',
};

@Injectable({ providedIn: 'root' })
export class PdfService {

  generar(datos: DatosPDF = MOCK_DATOS): void {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter',
    });

    const pw  = 215.9;
    const ph  = 279.4;
    const lm  = 15;
    const pad = 6;

    const recuadroTop    = ph * 0.52;
    const recuadroBottom = ph - 6;    
    const recuadroH      = recuadroBottom - recuadroTop;
    const recuadroW      = pw - lm * 2;

    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.rect(lm, recuadroTop, recuadroW, recuadroH);

    const x  = lm + pad;
    const rw = recuadroW - pad * 2;
    const cx = lm + recuadroW / 2;  
    let   y  = recuadroTop + 9;
    const lh = 5.4;  
    const fs = 8.5;
    const ulo = 1.1; 

    doc.setFontSize(fs);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    const inline = (
      segments: { text: string; bold: boolean }[],
      startX: number,
      posY: number,
      extendLast = false  
    ): number => {
      let curX = startX;
      const lastBoldIdx = extendLast
        ? segments.map(s => s.bold).lastIndexOf(true)
        : -1;

      segments.forEach((s, i) => {
        doc.setFontSize(fs);
        doc.setFont('helvetica', s.bold ? 'bold' : 'normal');
        doc.text(s.text, curX, posY);
        const tw = doc.getTextWidth(s.text);
        if (s.bold) {
          doc.setLineWidth(0.2);
          const lineEnd = (i === lastBoldIdx) ? (x + rw) : (curX + tw);
          doc.line(curX, posY + ulo, lineEnd, posY + ulo);
        }
        curX += tw;
      });
      doc.setFont('helvetica', 'normal');
      return curX;
    };

    const prefijo   = 'Quien suscribe, ';
    const jefaLines = doc.splitTextToSize(datos.jefa, rw - doc.getTextWidth(prefijo));
    inline([
      { text: prefijo,      bold: false },
      { text: jefaLines[0], bold: true  },
    ], x, y);
    for (let i = 1; i < jefaLines.length; i++) {
      y += lh;
      doc.setFont('helvetica', 'bold');
      doc.text(jefaLines[i], x, y);
      const tw = doc.getTextWidth(jefaLines[i]);
      doc.setLineWidth(0.2);
      doc.line(x, y + ulo, x + tw, y + ulo);
      doc.setFont('helvetica', 'normal');
    }
    y += lh * 2;  

    doc.setFontSize(fs);
    doc.setFont('helvetica', 'bold');
    doc.text('CERTIFICA:', cx, y, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    y += lh * 2; 

    inline([
      { text: 'Que la presente fotocopia del registrado de ', bold: false },
      { text: datos.tipoRegistro,                             bold: true  },
      { text: '  a nombre de  ',                              bold: false },
      { text: datos.nombreRegistrado,                         bold: true  },
    ], x, y, true);
    y += lh * 2;   

    inline([
      { text: 'es fiel y exacta reproducción del acervo registral que obran en  ', bold: false },
      { text: datos.archivoObra,                                                    bold: true  },
    ], x, y, true);
    y += lh * 1.4;

    inline([
      { text: 'como consta en la foja número  ', bold: false },
      { text: datos.foja,                        bold: true  },
      { text: '     acta número  ',              bold: false },
      { text: datos.acta,                        bold: true  },
      { text: '     de fecha  ',                 bold: false },
      { text: datos.fechaActa,                   bold: true  },
    ], x, y, true);
    y += lh * 1.4;

    inline([
      { text: 'levantada en  ', bold: false },
      { text: datos.levantadaEn, bold: true },
    ], x, y, true);
    y += lh;

    doc.setFontSize(fs);
    doc.setFont('helvetica', 'normal');

    const parrafoLimpio =
      'A petición de la parte interesada y con fundamento en los artículos 37, 52 del Código Civil ' +
      'para el Estado Libre y Soberano de Oaxaca, artículos 2, 3 y 11 del Reglamento del Registro ' +
      'Civil vigente, se extiende la presente, a los ' +
      datos.diaDe + ' días del mes de ' + datos.mesDe + ' de ' + datos.anioDe + ', doy fe.';

    const pLines = doc.splitTextToSize(parrafoLimpio, rw);
    const boldValues = [datos.diaDe, datos.mesDe, datos.anioDe];

    for (const line of pLines) {
      let remaining = line;
      let curX = x;

      while (remaining.length > 0) {
        let firstIdx = -1;
        let firstVal = '';
        for (const val of boldValues) {
          const idx = remaining.indexOf(val);
          if (idx !== -1 && (firstIdx === -1 || idx < firstIdx)) {
            firstIdx = idx;
            firstVal = val;
          }
        }

        if (firstIdx === -1) {
          doc.setFont('helvetica', 'normal');
          doc.text(remaining, curX, y);
          break;
        }

        if (firstIdx > 0) {
          const normalText = remaining.substring(0, firstIdx);
          doc.setFont('helvetica', 'normal');
          doc.text(normalText, curX, y);
          curX += doc.getTextWidth(normalText);
        }

        doc.setFont('helvetica', 'bold');
        doc.text(firstVal, curX, y);
        const valW = doc.getTextWidth(firstVal);
        doc.setLineWidth(0.2);
        doc.line(curX, y + ulo, curX + valW, y + ulo);
        curX += valW;

        remaining = remaining.substring(firstIdx + firstVal.length);
      }

      doc.setFont('helvetica', 'normal');
      y += lh;
    }

    const encargadoH  = 10;
    const firmaBottom = recuadroBottom - encargadoH - 4;
    const firmaY      = firmaBottom - lh;

    doc.setFontSize(fs);
    doc.setLineWidth(0.3);
    doc.line(cx - 38, firmaY, cx + 38, firmaY);
    doc.setFont('helvetica', 'bold');
    doc.text('JEFA DEL ARCHIVO CENTRAL', cx, firmaY + lh, { align: 'center' });
    doc.setFont('helvetica', 'normal');

    const encY1 = recuadroBottom - 8;
    const encY2 = recuadroBottom - 3.5;

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text('ENCARGADO DE EXPEDICIÓN DE DOCUMENTOS *', x, encY1);
    doc.setFont('helvetica', 'normal');
    doc.text(datos.encargado, x, encY2);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.text(
      '"CAUSA DERECHOS CONFORME AL ARTICULO 43 DE LA LEY ESTATAL DE DERECHOS DE OAXACA"',
      pw / 2,
      ph - 2,
      { align: 'center' }
    );

    doc.save(`fotocopia-${datos.acta}-${datos.anioDe}.pdf`);
  }
}