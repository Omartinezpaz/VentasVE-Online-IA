# Servicio de Subida de Imágenes - Documentación

## Características Implementadas

### 1. Almacenamiento Local
- Las imágenes se guardan en `uploads/products/`
- Nombres únicos generados con UUID
- Límite de 5MB por archivo
- Formatos permitidos: jpeg, jpg, png, webp

### 2. Endpoint de Subida
```
POST /api/products/:id/images
Content-Type: multipart/form-data

Body: FormData con campo 'images' (múltiples archivos)
```

### 3. Funcionalidad
- Sube hasta 5 imágenes simultáneamente
- Combina nuevas imágenes con las existentes del producto
- Retorna URLs accesibles públicamente
- Valida tipos de archivo y tamaño

### 4. Uso desde Frontend
```javascript
const formData = new FormData();
formData.append('images', file1);
formData.append('images', file2);

const response = await fetch('/api/products/123/images', {
  method: 'POST',
  body: formData,
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### 5. Estructura de Respuesta
```json
{
  "message": "Imágenes subidas exitosamente",
  "images": ["/uploads/products/abc123.jpg", "/uploads/products/def456.png"],
  "product": { /* producto actualizado */ }
}
```

## Configuración de Producción

Para producción, considera:
1. **Servicios Cloud**: AWS S3, Cloudinary, o Firebase Storage
2. **CDN**: Para distribución global de imágenes
3. **Optimización**: Compresión automática de imágenes
4. **Seguridad**: Validación adicional de archivos

## Notas de Seguridad
- Las imágenes se almacenan con nombres aleatorios
- Validación de tipos MIME
- Límite de tamaño preventivo
- No se ejecuta código en los archivos subidos