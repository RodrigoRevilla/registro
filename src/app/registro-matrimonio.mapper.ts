import { RegistroMatrimonio } from './http';
import { entidadDesdeTexto, fechaLocal, nombreCompleto } from './registro-nacimiento.mapper';

export interface MatrimonioForm {
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
  curpMatrimonial: string;
  regimen: string;
  status: string;
  nombre1: string;
  apellidoPaterno1: string;
  apellidoMaterno1: string;
  sexo1: string;
  edad1: number | null;
  fechaNacimiento1: Date | null;
  nacionalidad1: string;
  nombre2: string;
  apellidoPaterno2: string;
  apellidoMaterno2: string;
  sexo2: string;
  edad2: number | null;
  fechaNacimiento2: Date | null;
  nacionalidad2: string;
}

function fechaDesdePartes(anio: number | null, mes: number | null, dia: number | null): Date | null {
  if (!anio || !mes || !dia) return null;
  return new Date(anio, mes - 1, dia);
}

function sexoNormal(s: string | null | undefined): string {
  const v = (s ?? '').toUpperCase();
  return v === 'H' ? 'M' : v;
}

export function fechaRegistroMatrimonio(r: RegistroMatrimonio): Date | null {
  return fechaLocal(r.fecha_registro) ?? fechaDesdePartes(r.anio_registro, r.mes_registro, r.dia_registro);
}

export function actaMatrimonio(r: RegistroMatrimonio): string {
  const original = `${r.numero_acta_original ?? ''}`.trim();
  if (original) return original;
  return r.numero_acta != null ? `${r.numero_acta}` : '';
}

export function contrayente1(r: RegistroMatrimonio): string {
  return nombreCompleto(r.nombre_contrayente1, r.apellido_paterno_contrayente1, r.apellido_materno_contrayente1);
}

export function contrayente2(r: RegistroMatrimonio): string {
  return nombreCompleto(r.nombre_contrayente2, r.apellido_paterno_contrayente2, r.apellido_materno_contrayente2);
}

export function registroMatrimonioAFormulario(r: RegistroMatrimonio): MatrimonioForm {
  const fechaReg = fechaRegistroMatrimonio(r);
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
    numeroActa: actaMatrimonio(r),
    curpMatrimonial: r.curp_matrimonial ?? '',
    regimen: r.regimen_matrimonial ?? '',
    status: r.estatus_acervo ?? '',
    nombre1: r.nombre_contrayente1 ?? '',
    apellidoPaterno1: r.apellido_paterno_contrayente1 ?? '',
    apellidoMaterno1: r.apellido_materno_contrayente1 ?? '',
    sexo1: sexoNormal(r.sexo_contrayente1),
    edad1: r.edad_contrayente1,
    fechaNacimiento1: fechaLocal(r.fecha_nacimiento_contrayente1),
    nacionalidad1: r.nacionalidad_contrayente1_texto ?? '',
    nombre2: r.nombre_contrayente2 ?? '',
    apellidoPaterno2: r.apellido_paterno_contrayente2 ?? '',
    apellidoMaterno2: r.apellido_materno_contrayente2 ?? '',
    sexo2: sexoNormal(r.sexo_contrayente2),
    edad2: r.edad_contrayente2,
    fechaNacimiento2: fechaLocal(r.fecha_nacimiento_contrayente2),
    nacionalidad2: r.nacionalidad_contrayente2_texto ?? '',
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

export function formularioARegistroMatrimonio(f: any): Partial<RegistroMatrimonio> {
  const fReg = aFecha(f.fechaRegistro);
  const anioReg = entero(f.anioRegistro) ?? (fReg ? fReg.getFullYear() : null);
  const acta = (f.numeroActa ?? '').toString().trim();
  const f1 = aFecha(f.fechaNacimiento1);
  const f2 = aFecha(f.fechaNacimiento2);

  return {
    curp_matrimonial: txt(f.curpMatrimonial),
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
    regimen_matrimonial: txt(f.regimen),
    estatus_acervo: txt(f.status),
    nombre_contrayente1: txt(f.nombre1),
    apellido_paterno_contrayente1: txt(f.apellidoPaterno1),
    apellido_materno_contrayente1: txt(f.apellidoMaterno1),
    sexo_contrayente1: txt(f.sexo1),
    edad_contrayente1: entero(f.edad1),
    fecha_nacimiento_contrayente1: isoDia(f1),
    nacionalidad_contrayente1_texto: txt(f.nacionalidad1),
    nombre_contrayente2: txt(f.nombre2),
    apellido_paterno_contrayente2: txt(f.apellidoPaterno2),
    apellido_materno_contrayente2: txt(f.apellidoMaterno2),
    sexo_contrayente2: txt(f.sexo2),
    edad_contrayente2: entero(f.edad2),
    fecha_nacimiento_contrayente2: isoDia(f2),
    nacionalidad_contrayente2_texto: txt(f.nacionalidad2),
  };
}

function fechaCorta(d: Date | null): string {
  return d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` : '';
}

export function estadoSolicitudMatrimonio(r: RegistroMatrimonio, municipioNombre: string, tiposServicio: any[]): Record<string, any> {
  return {
    tiposServicio,
    entidad: r.estado_registro_historico_texto ?? '',
    municipio: municipioNombre,
    oficialia: r.oficialia != null ? `${r.oficialia}` : '',
    distrito: r.distrito_registro_historico_texto ?? '',
    localidad: r.localidad_registro_historica_texto ?? '',
    curpMat: r.curp_matrimonial ?? '',
    anio: r.anio_registro != null ? `${r.anio_registro}` : '',
    acta: actaMatrimonio(r),
    enDoc: '',
    fechaRegistro: fechaCorta(fechaRegistroMatrimonio(r)),
    nombre1: r.nombre_contrayente1 ?? '',
    apellidoPaterno1: r.apellido_paterno_contrayente1 ?? '',
    apellidoMaterno1: r.apellido_materno_contrayente1 ?? '',
    fechaNacimiento1: fechaCorta(fechaLocal(r.fecha_nacimiento_contrayente1)),
    nombre2: r.nombre_contrayente2 ?? '',
    apellidoPaterno2: r.apellido_paterno_contrayente2 ?? '',
    apellidoMaterno2: r.apellido_materno_contrayente2 ?? '',
    fechaNacimiento2: fechaCorta(fechaLocal(r.fecha_nacimiento_contrayente2)),
    status: r.estatus_acervo ?? '',
  };
}