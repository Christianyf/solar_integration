import { Component, OnInit } from '@angular/core';
import { RemoteServicesService } from '../remote-services.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {
  username: string = '';
  password: string = '';
  errorMessage: string = '';
  isLoading: boolean = false;

  constructor(private remoteService: RemoteServicesService, private router: Router) {}

  ngOnInit() {
    // Redirigir si ya hay un token, si se implementa debe tener una validación más fuerte
/*     const token = localStorage.getItem('authToken');
    if (token) {
      this.router.navigate(['/tabs']);
    } */
  }

  login(event: Event) {
    event.preventDefault(); // Evita que el formulario recargue la página

    // Validar campos
    if (!this.username || !this.password) {
      this.errorMessage = 'Por favor, completa todos los campos.';
      return;
    }

    this.errorMessage = ''; // Limpiar mensajes de error previos
    this.isLoading = true; // Mostrar indicador de carga

    this.remoteService.login(this.username, this.password).subscribe({
      next: (response) => {
        console.log('Acceso correcto:', response);
        localStorage.setItem('userRole', response.user.rol); // Guarda el rol de usuario,que viene desde el backend
        this.router.navigate(['/tabs']); // Redirige a los tabs
      },
      error: (error) => {
        console.error('Acceso incorrecto:', error);
        this.errorMessage = 'Credenciales incorrectas. Intenta de nuevo.';
      },
      complete: () => {
        this.isLoading = false; // Ocultar indicador de carga
      },
    });
  }
}
