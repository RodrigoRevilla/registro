import { RegistroNacimiento } from './http';

export const ENTIDADES: string[] = [
  'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas', 'Chihuahua',
  'Ciudad de México', 'Coahuila', 'Colima', 'Durango', 'Guanajuato', 'Guerrero', 'Hidalgo',
  'Jalisco', 'México', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca', 'Puebla',
  'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas',
  'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas',
];

export const ENTIDADES_INEGI: { clave: number; nombre: string }[] = [
  { clave: 1, nombre: 'Aguascalientes' },
  { clave: 2, nombre: 'Baja California' },
  { clave: 3, nombre: 'Baja California Sur' },
  { clave: 4, nombre: 'Campeche' },
  { clave: 5, nombre: 'Coahuila' },
  { clave: 6, nombre: 'Colima' },
  { clave: 7, nombre: 'Chiapas' },
  { clave: 8, nombre: 'Chihuahua' },
  { clave: 9, nombre: 'Ciudad de México' },
  { clave: 10, nombre: 'Durango' },
  { clave: 11, nombre: 'Guanajuato' },
  { clave: 12, nombre: 'Guerrero' },
  { clave: 13, nombre: 'Hidalgo' },
  { clave: 14, nombre: 'Jalisco' },
  { clave: 15, nombre: 'México' },
  { clave: 16, nombre: 'Michoacán' },
  { clave: 17, nombre: 'Morelos' },
  { clave: 18, nombre: 'Nayarit' },
  { clave: 19, nombre: 'Nuevo León' },
  { clave: 20, nombre: 'Oaxaca' },
  { clave: 21, nombre: 'Puebla' },
  { clave: 22, nombre: 'Querétaro' },
  { clave: 23, nombre: 'Quintana Roo' },
  { clave: 24, nombre: 'San Luis Potosí' },
  { clave: 25, nombre: 'Sinaloa' },
  { clave: 26, nombre: 'Sonora' },
  { clave: 27, nombre: 'Tabasco' },
  { clave: 28, nombre: 'Tamaulipas' },
  { clave: 29, nombre: 'Tlaxcala' },
  { clave: 30, nombre: 'Veracruz' },
  { clave: 31, nombre: 'Yucatán' },
  { clave: 32, nombre: 'Zacatecas' },
];

export interface ActaForm {
  entidad: string;
  municipio: string;
  oficialia: string;
  distrito: string;
  localidad: string;
  fechaRegistro: Date | null;
  anioRegistro: string;
  foja: string;
  numeroActa: string;
  curp: string;
  curp_regciv: string;
  libro: string;
  entidadNacimiento: string;
  municipioNacimiento: string;
  distritoNacimiento: string;
  localidadNacimiento: string;
  fechaNacimiento: Date | null;
  horaNacimiento: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  sexo: string;
  status: string;
  nombrePadre: string;
  apellidoPaternoPadre: string;
  apellidoMaternoPadre: string;
  edadPadre: number | null;
  nacionalidadPadre: string;
  nombreMadre: string;
  apellidoPaternoMadre: string;
  apellidoMaternoMadre: string;
  edadMadre: number | null;
  nacionalidadMadre: string;
}

export function normalizar(txt: string | null | undefined): string {
  return (txt ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

export function entidadDesdeTexto(txt: string | null | undefined): string {
  const n = normalizar(txt);
  if (!n) return '';
  if (n === 'EXTRANJERO') return 'Extranjero';
  return ENTIDADES.find(e => normalizar(e) === n) ?? txt ?? '';
}

export function fechaLocal(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function fechaDesdePartes(anio: number | null, mes: number | null, dia: number | null): Date | null {
  if (!anio || !mes || !dia) return null;
  return new Date(anio, mes - 1, dia);
}

export function nombreCompleto(...partes: (string | null | undefined)[]): string {
  return partes.filter(p => !!p && `${p}`.trim()).join(' ').trim();
}

export function sexoLabel(sexo: string | null | undefined): string {
  switch ((sexo ?? '').toUpperCase()) {
    case 'M': return 'Masculino';
    case 'H': return 'Masculino';
    case 'F': return 'Femenino';
    case 'X':
    case 'N': return 'No especificado';
    default: return sexo ?? '';
  }
}

export function estadoVitalLabel(ev: string | null | undefined): string {
  switch ((ev ?? '').toUpperCase()) {
    case 'V': return 'Vivo';
    case 'F':
    case 'M':
    case 'D': return 'Finado';
    default: return ev ?? '';
  }
}

export function registroAFormulario(r: RegistroNacimiento): ActaForm {
  const fechaReg = fechaLocal(r.fecha_registro) ?? fechaDesdePartes(r.anio_registro, r.mes_registro, r.dia_registro);
  const fechaNac = fechaDesdePartes(r.anio_nacimiento, r.mes_nacimiento, r.dia_nacimiento);
  return {
    entidad: entidadDesdeTexto(r.estado_registro_historico_texto),
    municipio: r.municipio_registro_historico_texto ?? '',
    oficialia: r.oficialia != null ? `${r.oficialia}` : '',
    distrito: r.distrito_registro_historico_texto ?? '',
    localidad: r.localidad_registro_historica_texto ?? '',
    fechaRegistro: fechaReg,
    anioRegistro: r.anio_registro != null ? `${r.anio_registro}` : (fechaReg ? `${fechaReg.getFullYear()}` : ''),
    foja: r.foja != null ? `${r.foja}` : '',
    numeroActa: r.numero_acta != null ? `${r.numero_acta}` : (r.numero_acta_original ?? ''),
    curp: r.curp ?? '',
    curp_regciv: r.crip_ed ?? '',
    libro: '',
    entidadNacimiento: entidadDesdeTexto(r.estado_nacimiento_historico_texto),
    municipioNacimiento: r.municipio_nacimiento_historico_texto ?? '',
    distritoNacimiento: r.distrito_nacimiento_historico_texto ?? '',
    localidadNacimiento: r.localidad_nacimiento_historica_texto ?? '',
    fechaNacimiento: fechaNac,
    horaNacimiento: (r.hora_nacimiento ?? '').slice(0, 5),
    nombre: r.nombre ?? '',
    apellidoPaterno: r.apellido_paterno ?? '',
    apellidoMaterno: r.apellido_materno ?? '',
    sexo: (r.sexo ?? '').toUpperCase() === 'H' ? 'M' : (r.sexo ?? '').toUpperCase(),
    status: '',
    nombrePadre: r.nombre_padre ?? '',
    apellidoPaternoPadre: r.apellido_paterno_padre ?? '',
    apellidoMaternoPadre: r.apellido_materno_padre ?? '',
    edadPadre: r.edad_padre,
    nacionalidadPadre: r.nacionalidad_padre_texto ?? '',
    nombreMadre: r.nombre_madre ?? '',
    apellidoPaternoMadre: r.apellido_paterno_madre ?? '',
    apellidoMaternoMadre: r.apellido_materno_madre ?? '',
    edadMadre: r.edad_madre,
    nacionalidadMadre: r.nacionalidad_madre_texto ?? '',
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

export function formularioARegistro(f: any): Partial<RegistroNacimiento> {
  const fReg = aFecha(f.fechaRegistro);
  const fNac = aFecha(f.fechaNacimiento);
  const hora = (f.horaNacimiento ?? '').toString().trim();
  const anioReg = entero(f.anioRegistro) ?? (fReg ? fReg.getFullYear() : null);
  const sexo = (f.sexo ?? '').toString().trim().toUpperCase();

  return {
    curp: txt(f.curp),
    crip_ed: txt(f.curp_regciv),
    estado_registro_historico_texto: txt(f.entidad),
    municipio_registro_historico_texto: txt(f.municipio),
    distrito_registro_historico_texto: txt(f.distrito),
    localidad_registro_historica_texto: txt(f.localidad),
    oficialia: entero(f.oficialia),
    dia_registro: fReg ? fReg.getDate() : null,
    mes_registro: fReg ? fReg.getMonth() + 1 : null,
    anio_registro: anioReg,
    fecha_registro: fReg ? `${fReg.getFullYear()}-${pad(fReg.getMonth() + 1)}-${pad(fReg.getDate())}T00:00:00Z` : null,
    numero_acta: entero(f.numeroActa),
    foja: txt(f.foja),
    nombre: txt(f.nombre) ?? '',
    apellido_paterno: txt(f.apellidoPaterno),
    apellido_materno: txt(f.apellidoMaterno),
    sexo: sexo || null,
    dia_nacimiento: fNac ? fNac.getDate() : null,
    mes_nacimiento: fNac ? fNac.getMonth() + 1 : null,
    anio_nacimiento: fNac ? fNac.getFullYear() : null,
    hora_nacimiento: hora ? (hora.length === 5 ? `${hora}:00` : hora) : null,
    estado_nacimiento_historico_texto: txt(f.entidadNacimiento),
    municipio_nacimiento_historico_texto: txt(f.municipioNacimiento),
    distrito_nacimiento_historico_texto: txt(f.distritoNacimiento),
    localidad_nacimiento_historica_texto: txt(f.localidadNacimiento),
    nombre_padre: txt(f.nombrePadre),
    apellido_paterno_padre: txt(f.apellidoPaternoPadre),
    apellido_materno_padre: txt(f.apellidoMaternoPadre),
    edad_padre: entero(f.edadPadre),
    nacionalidad_padre_texto: txt(f.nacionalidadPadre),
    nombre_madre: txt(f.nombreMadre),
    apellido_paterno_madre: txt(f.apellidoPaternoMadre),
    apellido_materno_madre: txt(f.apellidoMaternoMadre),
    edad_madre: entero(f.edadMadre),
    nacionalidad_madre_texto: txt(f.nacionalidadMadre),
  };
}