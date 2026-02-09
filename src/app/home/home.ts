import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { eventNames } from 'process';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class HomeComponent {
  
  constructor(private router: Router) {}

  navegarA(ruta: string) {
    this.router.navigate([ruta]);
  }

irANacimiento(event: MouseEvent){
  event?.stopImmediatePropagation();
  this.router.navigate(['/nacimiento']);
}

irATrabajo(event: MouseEvent){
  event?.stopImmediatePropagation();
  this.router.navigate(['/trabajo']);
}
}