import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { DialogoDeClaveTemporal } from './DialogoDeClaveTemporal';

const CLAVE = 'Tmp-8fKq-2026-Zx';

describe('DialogoDeClaveTemporal (CL-17, CA-30)', () => {
  test('F004_CA30_DialogoDeClave_NoSeCierraConEscNiClicFuera', async () => {
    const alEntregar = vi.fn();
    render(<DialogoDeClaveTemporal accion="Habilitar" claveTemporal={CLAVE} onEntregada={alEntregar} />);
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    await userEvent.click(document.body);

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText(CLAVE)).toBeInTheDocument();
    expect(alEntregar).not.toHaveBeenCalled();
  });

  test('F004_CA30_DialogoDeClave_YaLaEntregue_AvisaUnaSolaVez', async () => {
    const alEntregar = vi.fn();
    render(<DialogoDeClaveTemporal accion="Habilitar" claveTemporal={CLAVE} onEntregada={alEntregar} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Ya la entregué' }));

    expect(alEntregar).toHaveBeenCalledOnce();
  });

  test('F004_CA30_DialogoDeClave_Copiar_PoneLaClaveEnElPortapapeles', async () => {
    const usuario = userEvent.setup();
    render(<DialogoDeClaveTemporal accion="Habilitar" claveTemporal={CLAVE} onEntregada={vi.fn()} />);

    await usuario.click(await screen.findByRole('button', { name: 'Copiar' }));

    expect(await navigator.clipboard.readText()).toBe(CLAVE);
  });

  test('F004_CA30_DialogoDeClave_AccionHabilitar_ElTituloDiceHabilitado', async () => {
    render(<DialogoDeClaveTemporal accion="Habilitar" claveTemporal={CLAVE} onEntregada={vi.fn()} />);

    expect(await screen.findByRole('alertdialog', { name: /Habilitado/ })).toBeInTheDocument();
  });

  test('F004_CA31_DialogoDeClave_AccionRestablecer_ElTituloDiceRestablecido', async () => {
    render(<DialogoDeClaveTemporal accion="Restablecer" claveTemporal={CLAVE} onEntregada={vi.fn()} />);

    expect(await screen.findByRole('alertdialog', { name: /Restablecido/ })).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog', { name: /Habilitado/ })).not.toBeInTheDocument();
  });

  test('F004_CA30_DialogoDeClave_AlAbrirseElFocoEstaDentroDelDialogo', async () => {
    render(<DialogoDeClaveTemporal accion="Habilitar" claveTemporal={CLAVE} onEntregada={vi.fn()} />);

    const dialogo = await screen.findByRole('alertdialog');

    expect(dialogo.contains(document.activeElement)).toBe(true);
  });
});
