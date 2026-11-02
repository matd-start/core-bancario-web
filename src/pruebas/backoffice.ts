import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * La fila de una cuenta en la ficha (el elemento de lista o de tabla que contiene su número), para buscar dentro de ella
 * sus acciones y su estado sin confundirla con las demás cuentas.
 */
export function filaDeCuenta(numero: string): HTMLElement {
  const fila = screen.getByText(numero).closest<HTMLElement>('li, tr');
  if (fila === null) throw new Error(`La cuenta ${numero} no está dentro de una lista ni de una tabla.`);
  return fila;
}

/** Los botones de una fila de cuenta, por su texto: lo que el operador puede hacer con ella. */
export function accionesVisibles(contenedor: HTMLElement): string[] {
  return within(contenedor)
    .queryAllByRole('button')
    .map((boton) => boton.textContent);
}

/** Pulsa el botón de confirmación del diálogo de alerta que esté abierto (cerrar cuenta, habilitar, restablecer…). */
export async function confirmarEnElDialogo(nombreDelBoton: RegExp) {
  const dialogo = await screen.findByRole('alertdialog');
  await userEvent.click(within(dialogo).getByRole('button', { name: nombreDelBoton }));
}
