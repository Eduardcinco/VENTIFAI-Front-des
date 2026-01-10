import { NgModule } from '@angular/core';

// Módulo vacío creado como shim para evitar referencias a un AppModule antiguo.
// La aplicación usa `bootstrapApplication` con componentes standalone.
// Los interceptores están configurados en app.config.ts

@NgModule({
  declarations: [],
  imports: [],
  providers: []
})
export class AppModule { }
