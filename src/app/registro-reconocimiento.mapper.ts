import { RegistroReconocimiento } from './http';
import { entidadDesdeTexto, fechaLocal, nombreCompleto } from './registro-nacimiento.mapper';

export interface ReconocimientoForm {
  entidad: string;
  municipioId: string;
  municipio: string;
  oficialia: string;
  distrito: string;
  localidad: string;
  fechaRegistro: Date | null;
  anioRegistro: string;
  foja: string;
  libro: string;
  numeroActa: string;
  status: string;
  nombreReconocido: string;
  apellidoPaternoReconocido: string;
  apellidoMaternoReconocido: string;
  sexoReconocido: string;
  nombreReconocedor: string;
  apellidoPaternoReconocedor: string;
  apellidoMaternoReconocedor: string;
  parentescoReconocedor: string;
}

function fechaDesdePartes(anio: number | null, mes: number | null, dia: number | null): Date | null {
  if (!anio || !mes || !dia) return null;
  return new Date(anio, mes - 1, dia);
}

function sexoNormal(s: string | null | undefined): string {
  const v = (s ?? '').toUpperCase();
  return v === 'H' ? 'M' : v;
}

export function fechaRegistroReconocimiento(r: RegistroReconocimiento): Date | null {
  return fechaLocal(r.fecha_registro) ?? fechaDesdePartes(r.anio_registro, r.mes_registro, r.dia_registro);
}

export function actaReconocimiento(r: RegistroReconocimiento): string {
  const original = `${r.numero_acta_original ?? ''}`.trim();
  if (original) return original;
  return r.numero_acta != null ? `${r.numero_acta}` : '';
}

export function nombreReconocido(r: RegistroReconocimiento): string {
  return nombreCompleto(r.nombre_reconocido, r.apellido_paterno_reconocido, r.apellido_materno_reconocido);
}

export function nombreReconocedor(r: RegistroReconocimiento): string {
  return nombreCompleto(r.nombre_reconocedor, r.apellido_paterno_reconocedor, r.apellido_materno_reconocedor);
}

export function registroReconocimientoAFormulario(r: RegistroReconocimiento): ReconocimientoForm {
  const fechaReg = fechaRegistroReconocimiento(r);
  return {
    entidad: entidadDesdeTexto(r.estado_registro_historico_texto),
    municipioId: r.municipio_registro_historico_id != null ? `${r.municipio_registro_historico_id}` : '',
    municipio: r.municipio_registro_historico_texto ?? '',
    oficialia: r.oficialia != null ? `${r.oficialia}` : '',
    distrito: r.distrito_registro_historico_texto ?? '',
    localidad: r.localidad_registro_historica_texto ?? '',
    fechaRegistro: fechaReg,
    anioRegistro: r.anio_registro != null ? `${r.anio_registro}` : (fechaReg ? `${fechaReg.getFullYear()}` : ''),
    foja: r.foja != null ? `${r.foja}` : '',
    libro: r.libro ?? '',
    numeroActa: actaReconocimiento(r),
    status: r.estatus_acervo ?? '',
    nombreReconocido: r.nombre_reconocido ?? '',
    apellidoPaternoReconocido: r.apellido_paterno_reconocido ?? '',
    apellidoMaternoReconocido: r.apellido_materno_reconocido ?? '',
    sexoReconocido: sexoNormal(r.sexo_reconocido),
    nombreReconocedor: r.nombre_reconocedor ?? '',
    apellidoPaternoReconocedor: r.apellido_paterno_reconocedor ?? '',
    apellidoMaternoReconocedor: r.apellido_materno_reconocedor ?? '',
    parentescoReconocedor: r.parentesco_reconocedor ?? '',
  };
}

function txt(v: any): string | null {
  const s = (v ?? '').toString().trim();
  return s ? s.toUpperCase() : null;
}

function entero(v: any): number | null {
  const s = (v ?? '').toString().trim();
  if (!s) return null;
  const n = parseInt(s, 10);
  return isNaN(n) ? null : n;
}

function aFecha(v: any): Date | null {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  return fechaLocal(`${v}`);
}

function pad(n: number): string {
  return `${n}`.padStart(2, '0');
}

function isoDia(d: Date | null): string | null {
  return d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : null;
}

export function formularioARegistroReconocimiento(f: any): Partial<RegistroReconocimiento> {
  const fReg = aFecha(f.fechaRegistro);
  const anioReg = entero(f.anioRegistro) ?? (fReg ? fReg.getFullYear() : null);
  const acta = (f.numeroActa ?? '').toString().trim();

  return {
    estado_registro_historico_texto: txt(f.entidad),
    municipio_registro_historico_id: entero(f.municipioId),
    municipio_registro_historico_texto: txt(f.municipio),
    distrito_registro_historico_texto: txt(f.distrito),
    localidad_registro_historica_texto: txt(f.localidad),
    oficialia: entero(f.oficialia),
    dia_registro: fReg ? fReg.getDate() : null,
    mes_registro: fReg ? fReg.getMonth() + 1 : null,
    anio_registro: anioReg,
    fecha_registro: fReg ? `${isoDia(fReg)}T00:00:00Z` : null,
    numero_acta_original: acta || null,
    foja: txt(f.foja),
    libro: txt(f.libro),
    estatus_acervo: txt(f.status),
    nombre_reconocido: txt(f.nombreReconocido),
    apellido_paterno_reconocido: txt(f.apellidoPaternoReconocido),
    apellido_materno_reconocido: txt(f.apellidoMaternoReconocido),
    sexo_reconocido: txt(f.sexoReconocido),
    nombre_reconocedor: txt(f.nombreReconocedor),
    apellido_paterno_reconocedor: txt(f.apellidoPaternoReconocedor),
    apellido_materno_reconocedor: txt(f.apellidoMaternoReconocedor),
    parentesco_reconocedor: txt(f.parentescoReconocedor),
  };
}

function fechaCorta(d: Date | null): string {
  return d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` : '';
}

export function estadoSolicitudReconocimiento(r: RegistroReconocimiento, municipioNombre: string, tiposServicio: any[]): Record<string, any> {
  return {
    tiposServicio,
    entidad: r.estado_registro_historico_texto ?? '',
    municipio: municipioNombre,
    oficialia: r.oficialia != null ? `${r.oficialia}` : '',
    distrito: r.distrito_registro_historico_texto ?? '',
    localidad: r.localidad_registro_historica_texto ?? '',
    anio: r.anio_registro != null ? `${r.anio_registro}` : '',
    acta: actaReconocimiento(r),
    enDoc: '',
    fechaRegistro: fechaCorta(fechaRegistroReconocimiento(r)),
    nombreReconocido: r.nombre_reconocido ?? '',
    apellidoPaternoReconocido: r.apellido_paterno_reconocido ?? '',
    apellidoMaternoReconocido: r.apellido_materno_reconocido ?? '',
    nombreReconocedor: r.nombre_reconocedor ?? '',
    apellidoPaternoReconocedor: r.apellido_paterno_reconocedor ?? '',
    apellidoMaternoReconocedor: r.apellido_materno_reconocedor ?? '',
    status: r.estatus_acervo ?? '',
  };
}