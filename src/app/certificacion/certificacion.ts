import { Component } from '@angular/core';
import { Router } from '@angular/router'; 

@Component({
  selector: 'app-certificacion',
  templateUrl: './certificacion.html',
  styleUrls: ['./certificacion.scss'],
})
export class CertificacionComponent {
  constructor(private router: Router) {}

  imprimir(): void {
    window.print();
  }
  goHome(): void {
    this.router.navigate(['/home']);  
  }
}
