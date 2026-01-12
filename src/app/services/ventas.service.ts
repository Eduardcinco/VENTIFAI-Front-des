import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class VentasService {
  private base = `${environment.apiUrl}/ventas`;

  constructor(private http: HttpClient, private auth: AuthService) {}

  list(params?: any): Observable<any[]> {
    const negocioId = this.auth.getBusinessId();
    let httpParams = new HttpParams();
    if (negocioId) {
      httpParams = httpParams.set('negocioId', String(negocioId));
    }
    // Merge any additional params
    if (params) {
      Object.keys(params).forEach(key => {
        httpParams = httpParams.set(key, String(params[key]));
      });
    }
    return this.http.get<any[]>(this.base, { params: httpParams });
  }

  get(id: number): Observable<any> {
    return this.http.get<any>(`${this.base}/${id}`);
  }

  create(payload: any): Observable<any> {
    const negocioId = this.auth.getBusinessId();
    const body = { ...payload, negocioId };
    return this.http.post<any>(this.base, body);
  }
}
