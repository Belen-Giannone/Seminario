import { ConflictException } from '@nestjs/common';
import { Rol } from '@syssalud/shared-types';
import { AuthClient } from './auth.client';

describe('AuthClient (profesionales) — PRO-033', () => {
  it('OK: crea el usuario con rol PROFESIONAL', async () => {
    const authService = {
      crearUsuarioInterno: jest
        .fn()
        .mockResolvedValue({ id: 'usr-1', passwordInicial: 'abc' }),
    };
    const client = new AuthClient(authService as any);

    const resultado = await client.crearUsuario({
      nombre: 'Carlos',
      apellido: 'Bilardo',
      email: 'c@x.com',
    });

    expect(authService.crearUsuarioInterno).toHaveBeenCalledWith(
      expect.objectContaining({ rol: Rol.PROFESIONAL }),
    );
    expect(resultado?.id).toBe('usr-1');
  });

  it('degradación: si Auth rechaza (email duplicado), devuelve null en vez de lanzar', async () => {
    const authService = {
      crearUsuarioInterno: jest
        .fn()
        .mockRejectedValue(new ConflictException('duplicado')),
    };
    const client = new AuthClient(authService as any);

    const resultado = await client.crearUsuario({
      nombre: 'Carlos',
      apellido: 'Bilardo',
      email: 'c@x.com',
    });
    expect(resultado).toBeNull();
  });

  it('obtenerUsuarios: lista vacía no llama al service', async () => {
    const authService = { obtenerResumenesPorIds: jest.fn() };
    const client = new AuthClient(authService as any);
    await expect(client.obtenerUsuarios([])).resolves.toEqual([]);
    expect(authService.obtenerResumenesPorIds).not.toHaveBeenCalled();
  });
});
