import { NgModule } from '@angular/core';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { authInterceptor } from './interceptors/auth.interceptor';

// Módulo vacío creado como shim para evitar referencias a un AppModule antiguo.
// La aplicación usa `bootstrapApplication` con componentes standalone.

@NgModule({
  declarations: [],
  imports: [],
  providers: [
    { provide: HTTP_INTERCEPTORS, useValue: authInterceptor, multi: true }
  ]
})
export class AppModule { }
