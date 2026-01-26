import { Component } from '@angular/core';
import { NacimientoComponent } from './nacimiento/nacimiento';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NacimientoComponent, MatButtonModule, MatToolbarModule],
  templateUrl: './app.html',
})
export class AppComponent {}
