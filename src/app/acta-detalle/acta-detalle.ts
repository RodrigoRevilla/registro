import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-acta-detalle',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './acta-detalle.component.html',
  styleUrls: ['./acta-detalle.component.scss']
})
export class ActaDetalleComponent implements OnInit {
  actaId: string | null = null;

  // Simulación de datos
  acta: any = null;

  constructor(private route: ActivatedRoute) {}

ngOnInit() {
  this.actaId = this.route.snapshot.paramMap.get('curp');

  // Datos de prueba (ahora con Record<string, ...>)
  const datosSimulados: Record<string, {
    nombre: string;
    apellidoPaterno: string;
    apellidoMaterno: string;
    fechaNacimiento: string;
    horaNacimiento: string;
    sexo: string;
    entidadNacimiento: string;
    municipioNacimiento: string;
    localidad: string;
  }> = {
    TEST1234: {
      nombre: 'Juan',
      apellidoPaterno: 'Pérez',
      apellidoMaterno: 'García',
      fechaNacimiento: '2000-01-01',
      horaNacimiento: '12:30',
      sexo: 'M',
      entidadNacimiento: 'CDMX',
      municipioNacimiento: 'Coyoacán',
      localidad: 'Del Carmen',
    },
    ABCD5678: {
      nombre: 'María',
      apellidoPaterno: 'López',
      apellidoMaterno: 'Sánchez',
      fechaNacimiento: '2010-05-20',
      horaNacimiento: '08:15',
      sexo: 'F',
      entidadNacimiento: 'Jalisco',
      municipioNacimiento: 'Guadalajara',
      localidad: 'Chapalita',
    }
  };

  this.acta = this.actaId ? datosSimulados[this.actaId] || null : null;
}
}
