import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RemoteServicesService {

  private baseUrl = 'http://localhost:8100' //URL de la API

  constructor(private http: HttpClient) { }

  login(username: string, password:string): Observable<any> {
    const body = {username, password};
    return this.http.post(`${this.baseUrl}/login`, body);
  }

  getHomeData(): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/home`);
  }

  getStatusData(): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/status`);
  }

  getUsers(): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/users`);
  }
  
  getHistoricalData(): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/historical`);
  }
  
  getLastHourData() {
    return this.http.get<{ timestamp: string, irradiancia: number, potencia: number }[]>(
      `${this.baseUrl}/api/last-hour-data`
    );
  }

  addUser(user: { username: string; role: string; password?: string }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/api/users`, user);
  }

  updateUser(id: number, user: { username: string; role: string; password?: string }): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/api/users/${id}`, user, {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  deleteUser(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/api/users/${id}`, {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
