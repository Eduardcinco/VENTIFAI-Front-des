import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SystemService {
  private base = `${environment.apiUrl}//system`;
  constructor(private http: HttpClient) {}

  getTime(): Observable<{ nowUtc: string }> {
    return this.http.get<{ nowUtc: string }>(`${this.base}/time`);
  }
}
