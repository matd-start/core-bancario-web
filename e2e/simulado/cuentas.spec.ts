import { crearCuenta, expect, test } from './entorno';

test.describe('Saldos', () => {
  test('F004_CA19_SaldoLargo_ExactoEnElNavegador', async ({ page, bff }) => {
    bff.cuentas = [
      crearCuenta({
        id: '0199a000-0000-7000-8000-000000000002',
        numero: '1000000002',
        moneda: 'USD',
        saldo: { monto: '12345678901234.56', moneda: 'USD' },
      }),
      crearCuenta({ id: '0199a000-0000-7000-8000-000000000001', saldo: { monto: '1234567', moneda: 'COP' } }),
    ];

    await page.goto('/mis-cuentas');

    // Chromium usa un espacio duro entre el símbolo y el número: \s lo cubre.
    await expect(page.getByText(/^US\$\s12\.345\.678\.901\.234,56$/)).toBeVisible();
    await expect(page.getByText(/^\$\s1\.234\.567$/)).toBeVisible();
  });
});
