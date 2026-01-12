import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class CategoriesService {
  private apiUrl = `${environment.apiUrl}//categories`;

  constructor(private http: HttpClient, private auth: AuthService) {}

  list(params?: { search?: string }): Observable<any[]> {
    let httpParams = new HttpParams();
    const negocioId = this.auth.getBusinessId();
    if (params?.search) {
      httpParams = httpParams.set('search', params.search);
    }
    if (negocioId) {
      httpParams = httpParams.set('negocioId', String(negocioId));
    }
    return this.http.get<any[]>(this.apiUrl, { params: httpParams });
  }

  getAll(params?: { search?: string }): Observable<any[]> {
    return this.list(params);
  }

  get(id: number | string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  getById(id: number | string): Observable<any> {
    return this.get(id);
  }

  create(category: { name: string; parentId?: number | null }): Observable<any> {
    const negocioId = this.auth.getBusinessId();
    const body = { ...category, negocioId };
    return this.http.post<any>(this.apiUrl, body);
  }

  update(id: number | string, category: { name: string; parentId?: number | null }): Observable<any> {
    const negocioId = this.auth.getBusinessId();
    const body = { ...category, negocioId };
    return this.http.put<any>(`${this.apiUrl}/${id}`, body);
  }

  delete(id: number | string): Observable<any> {
    const negocioId = this.auth.getBusinessId();
    const params = negocioId ? new HttpParams().set('negocioId', String(negocioId)) : undefined;
    return this.http.delete<any>(`${this.apiUrl}/${id}`, { params });
  }
}
