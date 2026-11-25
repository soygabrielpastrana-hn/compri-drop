export function notFound(_req, res) {
  res.status(404).json({ message: 'Ruta no encontrada' });
}

// Nunca se envían detalles internos (stack, consultas, nombres de colecciones). Los errores 5xx se registran solo en el servidor.
export function errorHandler(err, _req, res, _next) {
  let status = Number(err.status) || 500;
  let message = err.message || 'Error del servidor';

  if (err.message === 'CORS_BLOCKED') {
    status = 403;
    message = 'Origen no permitido';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'El cuerpo de la solicitud no es un JSON válido';
  } else if (err.type === 'entity.too.large') {
    status = 413;
    message = 'La solicitud es demasiado grande';
  } else if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join('. ');
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'Dato inválido';
  } else if (err.code === 11000) {
    status = 409;
    message = 'Ya existe un registro con ese valor único';
  }

  if (status >= 500) console.error(err);
  res.status(status).json({ message: status >= 500 ? 'Error del servidor' : message });
}
