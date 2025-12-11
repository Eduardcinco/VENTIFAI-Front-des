# 📸 Guía para Capturar Imágenes de Paletas

Esta carpeta contiene las imágenes de previsualización para cada paleta de colores del sistema.

## 🎯 Imágenes Requeridas

Debes crear 6 capturas de pantalla con estos nombres exactos:

1. **azul-clasico.png** - Paleta Azul Clásico (masculina)
2. **verde-oscuro.png** - Paleta Verde Profesional (masculina)
3. **morado-tech.png** - Paleta Morado Tech (masculina)
4. **rosa-coral.png** - Paleta Rosa Coral (femenina)
5. **lavanda-suave.png** - Paleta Lavanda Suave (femenina)
6. **menta-fresh.png** - Paleta Menta Fresh (femenina)

## 📐 Especificaciones Técnicas

- **Dimensiones recomendadas**: 600x400 píxeles (ratio 3:2)
- **Formato**: PNG (transparencia opcional)
- **Peso máximo**: ~100KB por imagen
- **Resolución**: 72 DPI es suficiente

## 🎨 Cómo Capturar las Imágenes

### Método 1: Captura del Dashboard (RECOMENDADO)

1. **Abre la aplicación** en http://localhost:4200/dashboard
2. **Aplica cada paleta** desde Configuración → Apariencia
3. **Toma captura** del dashboard principal (no incluyas el navegador)
4. **Recorta** a 600x400px mostrando:
   - Sidebar con el color primario
   - Zona principal con el fondo
   - Algún botón o elemento con el color acento
   - Cards o elementos con el color secundario

### Método 2: Crear Maquetas Rápidas

Si prefieres diseñar las vistas manualmente:

1. **Usa Figma, Canva o PowerPoint**
2. **Crea un lienzo de 600x400px**
3. **Diseña una interfaz mini** con:
   ```
   ┌─────────────────────────────────┐
   │ [Barra superior: primario]      │
   ├──────┬──────────────────────────┤
   │      │                          │
   │ Side │  [Card: fondo]           │
   │ bar  │    • Botón: primario     │
   │ Pri  │    • Texto: secundario   │
   │ mario│    • Tag: acento         │
   │      │                          │
   └──────┴──────────────────────────┘
   ```
4. **Exporta como PNG**

### Método 3: Screenshot del Selector de Paletas

Para una solución rápida temporal:

1. Ve a Configuración → Apariencia
2. El preview generado automáticamente se ve así
3. Haz zoom al preview y captura solo ese preview
4. Recórtalo a 600x400px

## 🎨 Colores de Cada Paleta

### 1. Azul Clásico (azul-clasico.png)
```
Primario:    #1976d2
Secundario:  #1565c0
Fondo:       #f5f7fa
Acento:      #ff9800
```

### 2. Verde Profesional (verde-oscuro.png)
```
Primario:    #2d7a3e
Secundario:  #1e5a2e
Fondo:       #f1f8f4
Acento:      #f59e0b
```

### 3. Morado Tech (morado-tech.png)
```
Primario:    #667eea
Secundario:  #764ba2
Fondo:       #f7f7fc
Acento:      #f687b3
```

### 4. Rosa Coral (rosa-coral.png)
```
Primario:    #f687b3
Secundario:  #ed64a6
Fondo:       #fef5f8
Acento:      #ed8936
```

### 5. Lavanda Suave (lavanda-suave.png)
```
Primario:    #9f7aea
Secundario:  #805ad5
Fondo:       #faf5ff
Acento:      #ed8936
```

### 6. Menta Fresh (menta-fresh.png)
```
Primario:    #48bb78
Secundario:  #38a169
Fondo:       #f0fff4
Acento:      #f56565
```

## 🚀 Proceso Recomendado Paso a Paso

1. **Ejecuta la app**: `npm run start`
2. **Inicia sesión** como dueño/gerente
3. **Ve a Configuración** (⚙️)
4. **Tab "Apariencia"**
5. **Selecciona cada paleta una por una**
6. **Navega al Dashboard principal** (Home)
7. **Presiona PrtScn o usa Win+Shift+S** (Windows)
8. **Pega en Paint/Photoshop/Figma**
9. **Recorta a 600x400px** mostrando elementos clave
10. **Guarda como**: `nombre-de-paleta.png` en esta carpeta
11. **Repite para las 6 paletas**

## 🔄 Fallback Automático

Si una imagen no existe o no carga:
- El sistema mostrará automáticamente un preview generado con CSS
- No hay error, solo menos atractivo visualmente
- Pero es 100% funcional

## 📝 Notas

- Las imágenes son **opcionales pero muy recomendadas**
- Mejoran muchísimo la experiencia del usuario
- Ayudan a visualizar cómo se verá el sistema antes de aplicar
- Puedes actualizar las imágenes en cualquier momento
- Solo refresca la página para ver los cambios

## ✅ Checklist

- [ ] azul-clasico.png
- [ ] verde-oscuro.png
- [ ] morado-tech.png
- [ ] rosa-coral.png
- [ ] lavanda-suave.png
- [ ] menta-fresh.png

---

**¿Necesitas ayuda?** Las imágenes se cargan desde `/assets/themes/` y se muestran en el selector de paletas de Configuración.
