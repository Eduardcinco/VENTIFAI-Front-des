# Front-Zona-30

Sistema de gestión empresarial desarrollado con Angular 20.

## 🚀 Stack Tecnológico

- **Angular 20.3.0** - Framework principal
- **TypeScript 5.9.2** - Lenguaje de programación
- **Angular Material 20.2.14** - Componentes UI
- **Chart.js 4.5.1** - Visualización de datos
- **RxJS 7.8.0** - Programación reactiva
- **JWT** - Autenticación y autorización

## 📋 Características

- ✅ Sistema de autenticación con JWT
- ✅ Multi-negocio con contexto empresarial
- ✅ Dashboard con módulos especializados:
  - 💰 Punto de Venta (POS)
  - 📦 Gestión de Inventario
  - 👥 Clientes y Proveedores
  - 💵 Caja y Ventas
  - 📊 Reportes y Gráficas
  - ⚙️ Configuración del Sistema
  - 🔔 Alertas de Stock
- ✅ Sistema de permisos por roles
- ✅ Exportación a Excel/PDF
- ✅ Arquitectura standalone (Zone-less)

## 🛠️ Instalación

```bash
# Instalar dependencias
npm install

# Servidor de desarrollo
npm start

# Compilar para producción
npm run build

# Ejecutar pruebas
npm test
```

## 🌐 Servidor de Desarrollo

Una vez iniciado el servidor, navega a `http://localhost:4200/`.

La aplicación se recargará automáticamente al modificar los archivos fuente.

## 🏗️ Estructura del Proyecto

```
src/app/
├── components/       # Componentes UI
├── services/         # Servicios y lógica de negocio
├── guards/          # Protección de rutas
├── interfaces/      # Tipos TypeScript
└── environments/    # Configuración de entornos
```

## 🔗 Backend

Este frontend se conecta a un backend .NET en `http://localhost:5129`

## 📦 Build

```bash
npm run build
```

Los archivos compilados se almacenarán en el directorio `dist/`.

## 📚 Documentación Adicional

- [Angular CLI Overview](https://angular.dev/tools/cli)
- [Angular Documentation](https://angular.dev)

## 📄 Licencia

Proyecto privado - Zona 30

---

**Generado con Angular CLI 20.3.0**
