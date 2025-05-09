import { Component, OnInit } from '@angular/core';
import Chart from 'chart.js/auto';
import { RemoteServicesService } from '../remote-services.service';

@Component({
  selector: 'app-estatus',
  templateUrl: './status.page.html',
  styleUrls: ['./status.page.scss'],
})
export class StatusPage implements OnInit {
  estadosBooleanos: any[] = [];
  estadoGeneral: string = '';
  irradiancia24h: number[] = [];
  potencia24h: number[] = [];
  temperaturasPanel1: number[] = [];
  temperaturasPanel2: number[] = [];
  temperaturasNodo: number[] = [];

  constructor(private remoteService: RemoteServicesService) {}

  ngOnInit() {
    this.remoteService.getStatusData().subscribe((data) => {
      this.estadosBooleanos = data.estadosSistema;
      this.estadoGeneral = data.estadosInverter;
      this.irradiancia24h = data.irradiancia24h;
      this.potencia24h = data.potencia24h;
      this.temperaturasPanel1 = data.temperaturasPanel1;
      this.temperaturasPanel2 = data.temperaturasPanel2;
      this.temperaturasNodo = data.temperaturasNodo;

      // Crear gráficos con los datos recibidos
      this.crearGrafico('irradiancia24hChart', this.irradiancia24h, 'Irradiancia (W/m²)');
      this.crearGrafico('potencia24hChart', this.potencia24h, 'Potencia (W)');
      this.crearGrafico('tempPanel1Chart', this.temperaturasPanel1, 'Temperatura Panel 1 (°C)');
      this.crearGrafico('tempPanel2Chart', this.temperaturasPanel2, 'Temperatura Panel 2 (°C)');
      this.crearGrafico('tempNodoChart', this.temperaturasNodo, 'Temperatura Nodo (°C)');
    });
  }
  procesarEstados(estado: number): any[] {
    const nombresEstados = [
      'Carga/Descarga batería',
      'Conexión inverter',
      'Estado conversor',
      'Estado cargador',
      'Timeout',
      'Estado ESP32',
    ];
    return nombresEstados.map((nombre, index) => ({
      nombre,
      valor: (estado >> (5 - index)) & 1,
    }));
  }

  obtenerEstadoInverter(estado: number): string {
    const estadosInverter = ['Detenido', 'Off-grid', 'Stand-by', 'On-grid'];
    return estadosInverter[estado & 0b11]; // Extrae los dos bits menos significativos
  }

  crearGrafico(canvasId: string, data: number[], label: string) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        new Chart(ctx, {
          type: 'line',
          data: {
            labels: Array.from({ length: 24 }, (_, i) => `${i}h`), // Etiquetas de horas
            datasets: [
              {
                label,
                data,
                borderColor: 'blue',
                fill: false,
                cubicInterpolationMode: 'monotone',
                tension: 0.4,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: true },
              title: { display: true, text: label },
            },
            scales: {
              x: { title: { display: true, text: 'Hora' } },
              y: { title: { display: true, text: label }, beginAtZero: true },
            },
          },
        });
      }
    }
  }
}

