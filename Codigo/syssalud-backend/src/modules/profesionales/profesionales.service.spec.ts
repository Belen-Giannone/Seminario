/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return -- mocks tipados `any` a propósito (jest.fn) */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { DiaSemana, Rol } from '@syssalud/shared-types';
import { ProfesionalesService } from './profesionales.service';

function crearProfesional(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'prof-1',
    usuarioId: 'usr-1',
    especialidad: 'Cardiología',
    matricula: 'MP111',
    activo: true,
    horarios: [],
    ...overrides,
  };
}

describe('ProfesionalesService', () => {
  let profesionalesRepo: any;
  let horariosRepo: any;
  let authClient: any;
  let config: any;
  let service: ProfesionalesService;

  beforeEach(() => {
    profesionalesRepo = {
      create: jest.fn((data: any) => ({ ...data })),
      save: jest.fn((p: any) =>
        Promise.resolve(Array.isArray(p) ? p : { id: 'prof-1', ...p }),
      ),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    horariosRepo = {
      create: jest.fn((data: any) => ({ id: 'horario-1', ...data })),
      save: jest.fn((h: any) => Promise.resolve(h)),
      find: jest.fn().mockResolvedValue([]),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    authClient = {
      crearUsuario: jest.fn().mockResolvedValue({
        id: 'usr-1',
        nombre: 'Carlos',
        apellido: 'Bilardo',
        email: 'carlos@syssalud.com',
        passwordInicial: 'abc123',
      }),
      obtenerUsuarios: jest.fn().mockResolvedValue([]),
    };
    config = { get: jest.fn((_key: string, fallback: unknown) => fallback) };

    service = new ProfesionalesService(
      profesionalesRepo,
      horariosRepo,
      authClient,
      config,
    );
  });

  describe('crear (PRO-012)', () => {
    const dto = {
      nombre: 'Carlos',
      apellido: 'Bilardo',
      email: 'carlos@syssalud.com',
      especialidad: 'Cardiología',
      matricula: 'MP111',
    };

    it('crea el usuario en Auth y el profesional', async () => {
      profesionalesRepo.findOne.mockResolvedValueOnce(null); // matrícula libre
      profesionalesRepo.findOne.mockResolvedValueOnce(crearProfesional()); // buscarEntidadOFallar

      const { profesional, passwordInicial } = await service.crear(dto);

      expect(authClient.crearUsuario).toHaveBeenCalledWith(
        expect.objectContaining({
          nombre: 'Carlos',
          email: 'carlos@syssalud.com',
        }),
      );
      expect(profesional.especialidad).toBe('Cardiología');
      expect(passwordInicial).toBe('abc123');
    });

    it('PRO-023: rechaza matrícula duplicada con 409', async () => {
      profesionalesRepo.findOne.mockResolvedValueOnce(crearProfesional());
      await expect(service.crear(dto as any)).rejects.toThrow(
        ConflictException,
      );
      expect(authClient.crearUsuario).not.toHaveBeenCalled();
    });

    it('PRO-002 lenient: si Auth falla, crea el profesional con usuarioId null', async () => {
      authClient.crearUsuario.mockResolvedValue(null);
      profesionalesRepo.findOne.mockResolvedValueOnce(null);
      profesionalesRepo.findOne.mockResolvedValueOnce(
        crearProfesional({ usuarioId: null }),
      );

      const { profesional, passwordInicial } = await service.crear(dto);
      expect(profesional.usuarioId).toBeNull();
      expect(passwordInicial).toBeNull();
    });

    it('PRO-002 strict: si Auth falla, rechaza con 424', async () => {
      config.get = jest.fn((key: string, fallback: unknown) =>
        key === 'PROFESIONALES_VALIDAR_AUTH' ? 'strict' : fallback,
      );
      service = new ProfesionalesService(
        profesionalesRepo,
        horariosRepo,
        authClient,
        config,
      );
      authClient.crearUsuario.mockResolvedValue(null);
      profesionalesRepo.findOne.mockResolvedValueOnce(null);

      await expect(service.crear(dto as any)).rejects.toThrow(HttpException);
    });

    it('PRO-021/RN07 defensa en profundidad: rechaza horaInicio >= horaFin', async () => {
      profesionalesRepo.findOne.mockResolvedValueOnce(null);
      const dtoConHorario = {
        ...dto,
        horarios: [
          { diaSemana: DiaSemana.LUNES, horaInicio: '13:00', horaFin: '09:00' },
        ],
      };
      await expect(service.crear(dtoConHorario as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('PRO-022: rechaza franjas superpuestas en el mismo día', async () => {
      profesionalesRepo.findOne.mockResolvedValueOnce(null);
      const dtoConHorarios = {
        ...dto,
        horarios: [
          { diaSemana: DiaSemana.LUNES, horaInicio: '09:00', horaFin: '13:00' },
          { diaSemana: DiaSemana.LUNES, horaInicio: '12:00', horaFin: '15:00' },
        ],
      };
      await expect(service.crear(dtoConHorarios as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('listar (PRO-013)', () => {
    it('filtra por ?ids= y devuelve ProfesionalResumen con nombreCompleto resuelto', async () => {
      const qb = {
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([crearProfesional()]),
      };
      profesionalesRepo.createQueryBuilder.mockReturnValue(qb);
      authClient.obtenerUsuarios.mockResolvedValue([
        {
          id: 'usr-1',
          nombre: 'Carlos',
          apellido: 'Bilardo',
          email: 'c@x.com',
        },
      ]);

      const resultado = await service.listar({
        ids: ['prof-1'],
        activos: true,
      });

      expect(qb.andWhere).toHaveBeenCalledWith('p.id IN (:...ids)', {
        ids: ['prof-1'],
      });
      expect(qb.andWhere).toHaveBeenCalledWith('p.activo = :activos', {
        activos: true,
      });
      expect(resultado).toEqual([
        {
          id: 'prof-1',
          nombreCompleto: 'Carlos Bilardo',
          especialidad: 'Cardiología',
          activo: true,
        },
      ]);
    });
  });

  describe('buscarPorId (PRO-014)', () => {
    it('lanza NotFoundException si no existe', async () => {
      profesionalesRepo.findOne.mockResolvedValue(null);
      await expect(service.buscarPorId('no-existe')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('devuelve el profesional con nombreCompleto resuelto vía Auth', async () => {
      profesionalesRepo.findOne.mockResolvedValue(crearProfesional());
      authClient.obtenerUsuarios.mockResolvedValue([
        {
          id: 'usr-1',
          nombre: 'Carlos',
          apellido: 'Bilardo',
          email: 'carlos@syssalud.com',
        },
      ]);
      const dto = await service.buscarPorId('prof-1');
      expect(dto.nombreCompleto).toBe('Carlos Bilardo');
    });
  });

  describe('definirHorarios (PRO-016)', () => {
    const nuevosHorarios = {
      horarios: [
        { diaSemana: DiaSemana.LUNES, horaInicio: '09:00', horaFin: '13:00' },
      ],
    };

    it('IDOR: un PROFESIONAL no puede definir horarios de otro', async () => {
      profesionalesRepo.findOne.mockResolvedValue(
        crearProfesional({ usuarioId: 'otro-usuario' }),
      );
      await expect(
        service.definirHorarios('prof-1', nuevosHorarios as any, {
          sub: 'usr-1',
          rol: Rol.PROFESIONAL,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('el propio profesional puede definir sus horarios', async () => {
      profesionalesRepo.findOne.mockResolvedValue(
        crearProfesional({ usuarioId: 'usr-1' }),
      );
      const resultado = await service.definirHorarios(
        'prof-1',
        nuevosHorarios,
        {
          sub: 'usr-1',
          rol: Rol.PROFESIONAL,
        },
      );
      expect(horariosRepo.delete).toHaveBeenCalledWith({
        profesionalId: 'prof-1',
      });
      expect(resultado).toHaveLength(1);
    });

    it('la ASISTENTE puede definir horarios de cualquier profesional', async () => {
      profesionalesRepo.findOne.mockResolvedValue(
        crearProfesional({ usuarioId: 'otro-usuario' }),
      );
      await expect(
        service.definirHorarios('prof-1', nuevosHorarios as any, {
          sub: 'asis-1',
          rol: Rol.ASISTENTE,
        }),
      ).resolves.toHaveLength(1);
    });
  });

  describe('actualizar (PRO-017)', () => {
    it('baja lógica: activo=false', async () => {
      profesionalesRepo.findOne.mockResolvedValue(crearProfesional());
      const dto = await service.actualizar('prof-1', { activo: false });
      expect(dto.activo).toBe(false);
    });

    it('rechaza cambiar a una matrícula ya usada por otro profesional', async () => {
      profesionalesRepo.findOne.mockResolvedValueOnce(crearProfesional());
      profesionalesRepo.findOne.mockResolvedValueOnce(
        crearProfesional({ id: 'prof-2', matricula: 'MP999' }),
      );
      await expect(
        service.actualizar('prof-1', { matricula: 'MP999' } as any),
      ).rejects.toThrow(ConflictException);
    });
  });
});
