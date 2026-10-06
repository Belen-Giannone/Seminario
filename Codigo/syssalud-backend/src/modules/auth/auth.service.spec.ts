import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Rol } from '@syssalud/shared-types';
import { AuthService } from './auth.service';
import { Usuario } from './entities/usuario.entity';
import { PacientesClient } from './clients/pacientes.client';

describe('AuthService', () => {
  let service: AuthService;
  const usuariosRepo = {
    findOne: jest.fn(),
    create: jest.fn((data) => data),
    save: jest.fn(),
  };
  const jwtService = {
    signAsync: jest.fn().mockResolvedValue('token-firmado'),
  };
  const pacientesClient = { altaPerfil: jest.fn().mockResolvedValue(true) };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(Usuario), useValue: usuariosRepo },
        { provide: JwtService, useValue: jwtService },
        { provide: PacientesClient, useValue: pacientesClient },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('crea el paciente y devuelve token cuando el email/dni no existen', async () => {
      usuariosRepo.findOne.mockResolvedValue(null);
      usuariosRepo.save.mockResolvedValue({
        id: 'uuid-1',
        email: 'paciente@test.com',
        nombre: 'Dolores',
        apellido: 'Campos',
        rol: Rol.PACIENTE,
        dni: '30111222',
        telefono: '3411234567',
        domicilio: 'Calle 123',
        fechaNacimiento: '1990-01-01',
      });

      const result = await service.register({
        nombre: 'Dolores',
        apellido: 'Campos',
        dni: '30111222',
        fechaNacimiento: '1990-01-01',
        telefono: '3411234567',
        domicilio: 'Calle 123',
        email: 'paciente@test.com',
        password: 'Password123',
      });

      expect(result.accessToken).toBe('token-firmado');
      expect(result.usuario.rol).toBe(Rol.PACIENTE);
      // PAC-013: el autorregistro crea el perfil en Pacientes con el token emitido.
      expect(pacientesClient.altaPerfil).toHaveBeenCalledWith(
        {
          usuarioId: 'uuid-1',
          nombre: 'Dolores',
          apellido: 'Campos',
          dni: '30111222',
          fechaNacimiento: '1990-01-01',
          telefono: '3411234567',
          domicilio: 'Calle 123',
          email: 'paciente@test.com',
        },
        'token-firmado',
      );
    });

    it('si Pacientes no responde, el registro igual devuelve la sesión', async () => {
      usuariosRepo.findOne.mockResolvedValue(null);
      usuariosRepo.save.mockResolvedValue({
        id: 'uuid-1',
        email: 'paciente@test.com',
        nombre: 'Dolores',
        apellido: 'Campos',
        rol: Rol.PACIENTE,
        dni: '30111222',
        telefono: '3411234567',
        domicilio: 'Calle 123',
        fechaNacimiento: '1990-01-01',
      });
      pacientesClient.altaPerfil.mockResolvedValueOnce(false);

      await expect(
        service.register({
          nombre: 'Dolores',
          apellido: 'Campos',
          dni: '30111222',
          fechaNacimiento: '1990-01-01',
          telefono: '3411234567',
          domicilio: 'Calle 123',
          email: 'paciente@test.com',
          password: 'Password123',
        }),
      ).resolves.toMatchObject({ accessToken: 'token-firmado' });
    });

    it('rechaza el registro si el email o el dni ya existen (CUU01 3.a)', async () => {
      usuariosRepo.findOne.mockResolvedValue({ id: 'existente' });

      await expect(
        service.register({
          nombre: 'Dolores',
          apellido: 'Campos',
          dni: '30111222',
          fechaNacimiento: '1990-01-01',
          telefono: '3411234567',
          domicilio: 'Calle 123',
          email: 'paciente@test.com',
          password: 'Password123',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('login', () => {
    it('devuelve token con credenciales válidas', async () => {
      const passwordHash = await bcrypt.hash('Password123', 10);
      usuariosRepo.findOne.mockResolvedValue({
        id: 'uuid-1',
        email: 'paciente@test.com',
        passwordHash,
        nombre: 'Dolores',
        apellido: 'Campos',
        rol: Rol.PACIENTE,
        dni: '30111222',
        telefono: null,
        domicilio: null,
        fechaNacimiento: null,
      });

      const result = await service.login({
        email: 'paciente@test.com',
        password: 'Password123',
      });

      expect(result.accessToken).toBe('token-firmado');
      // Sin datos personales completos no se intenta crear el perfil.
      expect(pacientesClient.altaPerfil).not.toHaveBeenCalled();
    });

    it('al loguearse un PACIENTE con datos completos asegura su perfil (repara altas viejas)', async () => {
      const passwordHash = await bcrypt.hash('Password123', 10);
      usuariosRepo.findOne.mockResolvedValue({
        id: 'uuid-1',
        email: 'paciente@test.com',
        passwordHash,
        nombre: 'Dolores',
        apellido: 'Campos',
        rol: Rol.PACIENTE,
        dni: '30111222',
        telefono: '3411234567',
        domicilio: 'Calle 123',
        fechaNacimiento: '1990-01-01',
      });

      await service.login({
        email: 'paciente@test.com',
        password: 'Password123',
      });

      expect(pacientesClient.altaPerfil).toHaveBeenCalledTimes(1);
    });

    it('rechaza credenciales inválidas', async () => {
      usuariosRepo.findOne.mockResolvedValue(null);

      await expect(
        service.login({ email: 'no-existe@test.com', password: 'Password123' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
