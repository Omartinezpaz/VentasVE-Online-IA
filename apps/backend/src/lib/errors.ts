export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string        // 'PRODUCT_NOT_FOUND', 'SLUG_TAKEN', etc.
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// Errores comunes como constantes
export const Errors = {
  NotFound: (resource: string) =>
    new AppError(`${resource} no encontrado`, 404, 'NOT_FOUND'),
  Unauthorized: () =>
    new AppError('No autorizado', 401, 'UNAUTHORIZED'),
  Forbidden: () =>
    new AppError('Sin permisos para esta acción', 403, 'FORBIDDEN'),
  Conflict: (msg: string) =>
    new AppError(msg, 409, 'CONFLICT'),
  Validation: (msg: string) =>
    new AppError(msg, 422, 'VALIDATION_ERROR'),
};
