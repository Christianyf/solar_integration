import { Component, OnInit } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { RemoteServicesService } from '../remote-services.service';

interface HistoricalData {
  fechaHora: string;
  irradiancia: number;
  potencia: number;
  tempPanel1: number;
  tempPanel2: number;
  tempGabinete: number;
  rssi: number;
  bateria: number;
  estadoSistema: string;
  estadoInverter: string;
}

interface User {
  id: number;
  username: string;
  role: string;
  password?: string;
}

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})

export class SettingsPage implements OnInit {
  //users: { id: number; username: string; role: string; password?: string }[] = [];
  users: User[] = [];
  newUser: { id?: number; username: string; role: string; password?: string } = { username: '', role: 'usuario', password: '' };
  historicalData: HistoricalData[] = [];
  isEditing = false;
  editingIndex = -1;

  constructor(
    private alertController: AlertController,
    private remoteService: RemoteServicesService
  ) {}

  ngOnInit() {
    this.loadUsers();
    this.loadHistoricalData();
  }

  loadUsers() {
    this.remoteService.getUsers().subscribe(
      (data: any[]) => {
        this.users = data.map((user: any) => ({
          id: user.id,
          username: user.nombre, // 'nombre' de la base de datos se mapea a 'username'
          role: user.rol, // 'rol' de la base de datos se mapea a 'role'
        }));
        console.log('Usuarios cargados:', this.users);
      },
      (error) => {
        console.error('Error al cargar usuarios:', error);
      }
    );
  }
  

  loadHistoricalData() {
    this.remoteService.getHistoricalData().subscribe(
      (data) => {
        this.historicalData = data;
      },
      (error) => {
        console.error('Error al cargar datos históricos:', error);
      }
    );
  }

  async confirmDeleteUser(index: number) {
    const alert = await this.alertController.create({
      header: 'Confirmar Eliminación',
      message: '¿Estás seguro de que deseas eliminar este usuario?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          handler: () => {
            console.log('Eliminación cancelada');
          },
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            this.removeUser(index);
          },
        },
      ],
    });
  
    await alert.present();
  }
  
  async confirmSaveChanges() {
    const alert = await this.alertController.create({
      header: 'Confirmar Cambios',
      message: '¿Deseas guardar los cambios realizados al usuario?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          handler: () => {
            console.log('Guardado cancelado');
          },
        },
        {
          text: 'Guardar',
          handler: () => {
            if (this.editingIndex !== -1) {
              this.saveEditedUser();
            }
          },
        },
      ],
    });
  
    await alert.present();
  }
  // Método para agregar un usuario
  addUser() {
    if (this.newUser.username.trim()) {
      if (this.newUser.role === 'admin') {
        if (!this.newUser.password || this.newUser.password.trim() === '') {
          console.error('La contraseña no puede estar vacía para usuarios administradores.');
          return;
        }
      }
      this.remoteService.addUser(this.newUser).subscribe(
        (response) => {
          this.users.push({ ...this.newUser, id: response.id }); // Asume que el backend devuelve el id
          this.newUser = { username: '', role: 'usuario', password: '' };
        },
        (error) => {
          console.error('Error al agregar usuario:', error);
        }
      );
    } else {
      console.error('El nombre de usuario no puede estar vacío.');
    }
  }

  // Método para eliminar un usuario
  removeUser(index: number) {
    const userId = this.users[index].id;
    this.remoteService.deleteUser(userId).subscribe(
      (response) => {
        console.log('Usuario eliminado exitosamente');
        // Elimina el usuario de la lista solo si la eliminación fue exitosa
        this.users.splice(index, 1);
      },
      (error) => {
        console.error('Error al eliminar usuario:', error);
      }
    );
  }
  

  editUser(user: User, index: number) {
    this.isEditing = true;
    this.editingIndex = index;
    this.newUser = { ...user }; // Carga los datos del usuario a editar
  }
  
  saveEditedUser() {
    if (this.editingIndex !== -1 && this.newUser.id !== undefined) {
      const userData: any = {
        username: this.newUser.username,
        role: this.newUser.role,
      };
  
      if (this.newUser.password && this.newUser.password.trim() !== '') {
        userData.password = this.newUser.password;
      }
  
      this.remoteService.updateUser(this.newUser.id, userData).subscribe(
        (response) => {
          this.users[this.editingIndex] = { ...this.newUser, id: this.newUser.id! };
          this.cancelEdit();
        },
        (error) => {
          console.error('Error al actualizar usuario:', error);
        }
      );
    } else {
      console.error('Error: El usuario no tiene un ID válido.');
    }
  }
  
  
  
  
  cancelEdit() {
    // Resetea el formulario y desactiva el modo de edición
    this.isEditing = false;
    this.editingIndex = -1;
    this.newUser = { username: '', role: '' };
  }
  
  
  // Método para el botón de descarga del archivo en formato CSV
  exportToCSV() {
    const csvHeaders = [
      'Fecha y Hora',
      'Irradiancia (W/m²)',
      'Potencia (W)',
      'Temp. Panel 1 (°C)',
      'Temp. Panel 2 (°C)',
      'Temp. Gabinete (°C)',
      'RSSI (dBm)',
      'Batería (%)',
      'Estado Sistema',
      'Estado Inverter',
    ];
  
    const rows = this.historicalData.map(row => [
      row.fechaHora,
      row.irradiancia,
      row.potencia,
      row.tempPanel1,
      row.tempPanel2,
      row.tempGabinete,
      row.rssi,
      row.bateria,
      row.estadoSistema,
      row.estadoInverter,
    ]);
  
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [csvHeaders.join(','), ...rows.map(e => e.join(','))].join('\n');
  
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'datos_historicos.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
}
