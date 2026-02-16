import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../http';
import { AuthService } from '../auth';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-certificacion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './certificacion.html',
  styleUrls: ['./certificacion.scss'],
})
export class CertificacionComponent implements OnInit {
  solicitudId: number = 2;
  folio: string = 'HV-2026-001234';
  actosRegistrales: any[] = [];
  selectedActo: any;

  datosSolicitud = {
    acto_registral_id: 1,
    tipo_servicio_id: 1,
    ventanilla_id: 1,
    fecha_entrega_resultado: '2026-02-15',
    nombre_contribuyente: 'JUAN PEREZ LOPEZ',
    rfc: 'XAXX010101000',
    email: 'juan@example.com',
    codigo_postal: '68000',
    uso_cfdi: 'S01',
    regimen_fiscal: '616'
  };

  constructor(
    private router: Router,
    private apiService: ApiService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.cargarActosRegistrales();
  }

  cargarActosRegistrales(): void {
    const token = this.authService.getToken();
    if (!token) {
      console.log('Token no disponible, redirigiendo al login');
      this.router.navigate(['/login']);
      return;
    }

    this.apiService.getActosRegistrales().subscribe(
      (response) => {
        if (response.ok) {
          this.actosRegistrales = response.data;
          console.log('Actos registrales cargados:', this.actosRegistrales);
        } else {
          console.error('Error al cargar los actos registrales');
        }
      },
      (error) => {
        console.error('Error al hacer la solicitud GET', error);
      }
    );
  }

  crearNuevaSolicitud(): void {
    console.log('Creando nueva solicitud...');
    const token = this.authService.getToken();
    if (!token) {
      console.log('Token no disponible, redirigiendo al login');
      this.router.navigate(['/login']);
      return;
    }

    this.apiService.crearSolicitud(this.datosSolicitud).subscribe(
      (response) => {
        if (response.ok) {
          console.log('Solicitud creada exitosamente:', response.data);
          this.solicitudId = response.data.solicitud.id;
          this.folio = response.data.solicitud.folio;
          console.log('ID de solicitud:', this.solicitudId);
          console.log('Folio:', this.folio);
          console.log('Referencia de pago:', response.data.pago.referencia_pago);
          console.log('URL PDF:', response.data.pago.url_pdf);
        } else {
          console.error('Error en la respuesta al crear solicitud');
        }
      },
      (error) => {
        console.error('Error al crear solicitud', error);
      }
    );
  }

  verificarYCertificar(): void {
    this.apiService.getSolicitud(this.solicitudId).subscribe({
      next: (response) => {
        const estadoActual = response.data.estado_actual;
        console.log('Estado actual de la solicitud:', estadoActual);
        if (estadoActual === 'EN_PROCESO') {
          this.certificar();
        } else {
          alert(`No se puede certificar. Estado actual: ${estadoActual}. ` +
            `Debe pasar por los estados previos según el tipo de servicio.`);
          console.warn(`No se puede certificar. Estado actual: ${estadoActual}`);
        }
      },
      error: (err) => {
        console.error('Error al obtener la solicitud', err);
        alert('Error al verificar la solicitud. Revisa la consola para más detalles.');
      }
    });
  }

  certificar(): void {
    const token = this.authService.getToken();
    if (!token) {
      console.log('Token no disponible, redirigiendo al login');
      this.router.navigate(['/login']);
      return;
    }

    this.apiService.cambiarEstado(this.solicitudId, 'CERTIFICACION_EMITIDA', '')
      .subscribe({
        next: (response) => {
          console.log('Certificación emitida exitosamente', response);
          this.registrarImpresion();
          alert('Certificación emitida exitosamente');
        },
        error: (error) => {
          console.error('Error HTTP completo:', error);
          if (error.error?.error?.message) {
            alert(`Error al certificar: ${error.error.error.message}`);
          } else if (error.statusText) {
            alert(`Error al certificar: ${error.statusText}`);
          } else {
            alert('Error desconocido al certificar la solicitud');
          }
        }
      });
  }


  registrarImpresion(): void {
    console.log('Registrando impresión...');
    this.apiService.registrarImpresion(this.solicitudId, this.folio).subscribe(
      (impresionResponse) => {
        console.log('Impresión registrada correctamente', impresionResponse);
        this.imprimir();
      },
      (impresionError) => {
        console.error('Error al registrar impresión', impresionError);
      }
    );
  }

  imprimir(): void {
    console.log('Imprimiendo...');
    setTimeout(() => {
      window.print();
    }, 500);
  }

  goHome(): void {
    this.router.navigate(['/home']);
  }
}
