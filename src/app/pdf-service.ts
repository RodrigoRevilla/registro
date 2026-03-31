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
  jefa: 'C. PEDRO VASQUEZ MORALES, JEFE DEL ARCHIVO CENTRAL DEL REGISTRO CIVIL DEL ESTADO DE OAXACA',
  encargado: 'LIC. CORAL AVEDAÑO MOLINA',
};

@Injectable({ providedIn: 'root' })
export class PdfService {

  generar(datos: DatosPDF = MOCK_DATOS): void {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [216, 330],
      compress: true,
      putOnlyUsedFonts: true,
    });

    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();

    const lm = 18;
    const pad = 4;

    const recuadroH = 120;
    const recuadroBottom = ph - 25;
    const recuadroTop = recuadroBottom - recuadroH;
    const recuadroW = pw - lm * 2;

    const fs = 8.5;
    const lh = 5.4;
    const ulo = 1.1;

    const x = lm + pad;
    const rw = recuadroW - pad * 2;
    const cx = lm + recuadroW / 2;

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

    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.rect(lm, recuadroTop, recuadroW, recuadroH);

    doc.setFontSize(fs);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    let y = recuadroTop + 9;

    const prefijo = 'Quien suscribe, ';
    const jefaLines = doc.splitTextToSize(datos.jefa, rw - doc.getTextWidth(prefijo));

    inline([
      { text: prefijo, bold: false },
      { text: jefaLines[0], bold: true },
    ], x, y);

    for (let i = 1; i < jefaLines.length; i++) {
      y += lh;
      doc.setFont('helvetica', 'bold');
      doc.text(jefaLines[i], x, y);
      doc.setLineWidth(0.2);
      doc.line(x, y + ulo, x + doc.getTextWidth(jefaLines[i]), y + ulo);
      doc.setFont('helvetica', 'normal');
    }
    y += lh * 2;

    doc.setFont('helvetica', 'bold');
    doc.text('CERTIFICA:', cx, y, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    y += lh * 2;

    inline([
      { text: 'Que la presente fotocopia del registrado de ', bold: false },
      { text: datos.tipoRegistro, bold: true },
      { text: '  a nombre de  ', bold: false },
      { text: datos.nombreRegistrado, bold: true },
    ], x, y, true);
    y += lh * 2;

    inline([
      { text: 'es fiel y exacta reproducción del acervo registral que obran en  ', bold: false },
      { text: datos.archivoObra, bold: true },
    ], x, y, true);
    y += lh * 1.4;

    inline([
      { text: 'como consta en la foja número  ', bold: false },
      { text: datos.foja, bold: true },
      { text: '     acta número  ', bold: false },
      { text: datos.acta, bold: true },
      { text: '     de fecha  ', bold: false },
      { text: datos.fechaActa, bold: true },
    ], x, y, true);
    y += lh * 1.4;

    inline([
      { text: 'levantada en  ', bold: false },
      { text: datos.levantadaEn, bold: true },
    ], x, y, true);
    y += lh;

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
          const before = remaining.substring(0, firstIdx);
          doc.setFont('helvetica', 'normal');
          doc.text(before, curX, y);
          curX += doc.getTextWidth(before);
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

    y += lh * 2;
    const firmaY = y;
    doc.setLineWidth(0.3);
    doc.line(cx - 38, firmaY, cx + 38, firmaY);
    doc.setFont('helvetica', 'bold');
    doc.text('JEFE DEL ARCHIVO CENTRAL', cx, firmaY + lh, { align: 'center' });
    doc.setFont('helvetica', 'normal');

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text('ENCARGADO DE EXPEDICIÓN DE DOCUMENTOS *', x, recuadroBottom - 8);
    doc.setFont('helvetica', 'normal');
    doc.text(datos.encargado, x, recuadroBottom - 3.5);

    doc.setFontSize(6.5);
    doc.text(
      '"CAUSA DERECHOS CONFORME AL ARTICULO 43 DE LA LEY ESTATAL DE DERECHOS DE OAXACA"',
      pw / 2,
      recuadroBottom + 6,
      { align: 'center' }
    );

    doc.setProperties({
      title: `Fotocopia Acta ${datos.acta} - ${datos.anioDe}`,
      subject: `Certificación ${datos.tipoRegistro}`,
      author: 'Registro Civil Oaxaca',
      creator: 'Sistema Registro Civil',
    });

    const pdfInternal = (doc as any).internal;
    pdfInternal.events.subscribe('putCatalog', () => {
      pdfInternal.write(
        '/ViewerPreferences << /PrintScaling /None >> ' +
        '/OpenAction [0 0 R /Fit]'
      );
    });

    doc.save(`fotocopia-${datos.acta}-${datos.anioDe}.pdf`);
  }
}