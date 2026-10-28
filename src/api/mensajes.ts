import type { CodigoDeError } from './errores';

/** Lo que se muestra cuando no hay un mensaje propio para el error. Después va el traceId (RNF-12, CL-24). */
export const MENSAJE_GENERICO = 'Algo salió mal. Si continúa, comunícate con soporte e indica este código:';

/**
 * Un mensaje por cada código del catálogo (RNF-12). El tipo `Record<CodigoDeError, string>` hace que, si la API agrega
 * un código al contrato y aquí falta su mensaje, el proyecto no compile (CA-34).
 */
export const MENSAJES_DE_ERROR: Record<CodigoDeError, string> = {
  'acceso-no-habilitado': 'El acceso digital de este cliente no está habilitado.',
  'conflicto-de-concurrencia': 'La cuenta cambió mientras tanto. Actualiza la pantalla e inténtalo de nuevo.',
  'datos-invalidos': 'Revisa los datos ingresados.',
  'documento-duplicado': 'Ya existe un cliente con ese documento.',
  'error-inesperado': MENSAJE_GENERICO,
  'identidad-error':
    'El servicio de identidad no pudo completar la operación. Puedes reintentar sin riesgo de que se repita.',
  'identidad-sin-respuesta':
    'El servicio de identidad no respondió. Puedes reintentar sin riesgo de que se repita la operación.',
  'monedas-distintas': 'Las monedas de la operación no coinciden.',
  'monto-negativo': 'El monto no puede ser negativo.',
  'monto-no-positivo': 'El monto debe ser mayor que cero.',
  'no-autenticado': 'Tu sesión no está activa. Inicia sesión de nuevo.',
  'no-encontrado': 'No encontramos lo que buscas.',
  'operacion-no-permitida': 'Esta operación no está permitida.',
  'precision-excedida': 'El monto tiene más decimales de los permitidos.',
  prohibido: 'No tienes permiso para realizar esta acción.',
  'regla-de-negocio': 'La operación no cumple las reglas del banco.',
  'saldo-distinto-de-cero': 'No se puede cerrar una cuenta con saldo distinto de cero.',
  'saldo-insuficiente': 'El saldo es insuficiente.',
  'transicion-no-permitida': 'La cuenta no puede pasar a ese estado desde el estado actual.',
};
