import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { AuthService } from '../auth';
import { HttpClientModule, HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    HttpClientModule
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class LoginComponent {
  loading = false;
  hidePassword = true;
  loginForm: any;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private http: HttpClient
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(4)]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  login() {
    if (this.loginForm.invalid) {
      alert('Por favor completa todos los campos correctamente');
      return;
    }

    this.loading = true;
    const { username, password } = this.loginForm.value;

    this.http.post<any>(
      'https://uncarolled-kaylene-unplentiful.ngrok-free.dev/api/v1/auth/login',
      { username, password }
    ).subscribe({
      next: (res) => {
        if (res.ok && res.data?.token && res.data?.usuario) {
          this.authService.login(res.data.token, res.data.usuario);
          this.router.navigate(['/home']);
        } else {
          alert(res.message || 'Usuario o contraseña incorrectos');
          this.loginForm.reset({ username: '', password: '' });
          this.hidePassword = true;
          this.loading = false;
        }
      },
      error: (err) => {
        console.error(err);
        alert(err.status === 404 ? 'Usuario no encontrado' :
          err.status === 401 ? 'Usuario o contraseña incorrectos' :
            'Error de conexión con el servidor');

        this.loginForm.reset({ username: '', password: '' });
        this.hidePassword = true;
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
  }
}
