import { RegistroDefuncion } from './http';
import { entidadDesdeTexto, fechaLocal, nombreCompleto } from './registro-nacimiento.mapper';

export interface DefuncionForm {
  entidad: string;
  municipioId: string;
  municipio: string;
  oficialia: string;
  distrito: string;
  localidad: string;
  tipoDefuncion: string;
  numeroActa: string;
  anioRegistro: string;
  fechaRegistro: Date | null;
  llave: string;
  foja: string;
  libro: string;
  entidadDefuncion: string;
  municipioDefuncion: string;
  distritoDefuncion: string;
  localidadDefuncion: string;
  fechaDefuncion: Date | null;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  sexo: string;
  edad: number | null;
  status: string;
}

function fechaDesdePartes(anio: number | null, mes: number | null, dia: number | null): Date | null {
  if (!anio || !mes || !dia) return null;
  return new Date(anio, mes - 1, dia);
}

function sexoNormal(s: string | null | undefined): string {
  const v = (s ?? '').toUpperCase();
  return v === 'H' ? 'M' : v;
}

export function fechaRegistroDefuncion(r: RegistroDefuncion): Date | null {
  return fechaLocal(r.fecha_registro) ?? fechaDesdePartes(r.anio_registro, r.mes_registro, r.dia_registro);
}

export function fechaDefuncion(r: RegistroDefuncion): Date | null {
  return fechaLocal(r.fecha_defuncion);
}

export function actaDefuncion(r: RegistroDefuncion): string {
  const original = `${r.numero_acta_original ?? ''}`.trim();
  if (original) return original;
  return r.numero_acta != null ? `${r.numero_acta}` : '';
}

export function nombreFinado(r: RegistroDefuncion): string {
  return nombreCompleto(r.nombre, r.apellido_paterno, r.apellido_materno);
}

export function registroDefuncionAFormulario(r: RegistroDefuncion): DefuncionForm {
  const fechaReg = fechaRegistroDefuncion(r);
  return {
    entidad: entidadDesdeTexto(r.estado_registro_historico_texto),
    municipioId: r.municipio_registro_historico_id != null ? `${r.municipio_registro_historico_id}` : '',
    municipio: r.municipio_registro_historico_texto ?? '',
    oficialia: r.oficialia != null ? `${r.oficialia}` : '',
    distrito: r.distrito_registro_historico_texto ?? '',
    localidad: r.localidad_registro_historica_texto ?? '',
    tipoDefuncion: r.tipo_defuncion ?? '',
    numeroActa: actaDefuncion(r),
    anioRegistro: r.anio_registro != null ? `${r.anio_registro}` : (fechaReg ? `${fechaReg.getFullYear()}` : ''),
    fechaRegistro: fechaReg,
    llave: r.llave ?? '',
    foja: r.foja != null ? `${r.foja}` : '',
    libro: r.libro ?? '',
    entidadDefuncion: entidadDesdeTexto(r.estado_defuncion_historico_texto),
    municipioDefuncion: r.municipio_defuncion_historico_texto ?? '',
    distritoDefuncion: r.distrito_defuncion_historico_texto ?? '',
    localidadDefuncion: r.localidad_defuncion_historica_texto ?? '',
    fechaDefuncion: fechaDefuncion(r),
    nombre: r.nombre ?? '',
    apellidoPaterno: r.apellido_paterno ?? '',
    apellidoMaterno: r.apellido_materno ?? '',
    sexo: sexoNormal(r.sexo),
    edad: r.edad,
    status: r.estatus_acervo ?? '',
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

export function formularioARegistroDefuncion(f: any): Partial<RegistroDefuncion> {
  const fReg = aFecha(f.fechaRegistro);
  const fDef = aFecha(f.fechaDefuncion);
  const anioReg = entero(f.anioRegistro) ?? (fReg ? fReg.getFullYear() : null);
  const acta = (f.numeroActa ?? '').toString().trim();

  return {
    llave: txt(f.llave),
    estado_registro_historico_texto: txt(f.entidad),
    municipio_registro_historico_id: entero(f.municipioId),
    municipio_registro_historico_texto: txt(f.municipio),
    distrito_registro_historico_texto: txt(f.distrito),
    localidad_registro_historica_texto: txt(f.localidad),
    oficialia: entero(f.oficialia),
    tipo_defuncion: txt(f.tipoDefuncion),
    dia_registro: fReg ? fReg.getDate() : null,
    mes_registro: fReg ? fReg.getMonth() + 1 : null,
    anio_registro: anioReg,
    fecha_registro: fReg ? `${isoDia(fReg)}T00:00:00Z` : null,
    numero_acta_original: acta || null,
    foja: txt(f.foja),
    libro: txt(f.libro),
    estado_defuncion_historico_texto: txt(f.entidadDefuncion),
    municipio_defuncion_historico_texto: txt(f.municipioDefuncion),
    distrito_defuncion_historico_texto: txt(f.distritoDefuncion),
    localidad_defuncion_historica_texto: txt(f.localidadDefuncion),
    fecha_defuncion: isoDia(fDef),
    nombre: txt(f.nombre),
    apellido_paterno: txt(f.apellidoPaterno),
    apellido_materno: txt(f.apellidoMaterno),
    sexo: txt(f.sexo),
    edad: entero(f.edad),
    estatus_acervo: txt(f.status),
  };
}

function fechaCorta(d: Date | null): string {
  return d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` : '';
}

export function estadoSolicitudDefuncion(r: RegistroDefuncion, municipioNombre: string, tiposServicio: any[]): Record<string, any> {
  return {
    tiposServicio,
    entidad: r.estado_registro_historico_texto ?? '',
    municipio: municipioNombre,
    oficialia: r.oficialia != null ? `${r.oficialia}` : '',
    distrito: r.distrito_registro_historico_texto ?? '',
    localidad: r.localidad_registro_historica_texto ?? '',
    llave: r.llave ?? '',
    tipoDefuncion: r.tipo_defuncion ?? '',
    anio: r.anio_registro != null ? `${r.anio_registro}` : '',
    acta: actaDefuncion(r),
    enDoc: '',
    fechaRegistro: fechaCorta(fechaRegistroDefuncion(r)),
    fechaDefuncion: fechaCorta(fechaDefuncion(r)),
    lugarDefuncion: [r.localidad_defuncion_historica_texto, r.municipio_defuncion_historico_texto]
      .map(x => `${x ?? ''}`.trim()).filter(Boolean).join(', '),
    nombre: r.nombre ?? '',
    apellidoPaterno: r.apellido_paterno ?? '',
    apellidoMaterno: r.apellido_materno ?? '',
    status: r.estatus_acervo ?? '',
  };
}