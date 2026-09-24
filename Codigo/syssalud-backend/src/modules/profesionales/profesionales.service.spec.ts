import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DiaSemana } from '@syssalud/shared-types';
import { HorarioAtencion } from './entities/horario-atencion.entity';
import { Profesional } from './entities/profesional.entity';
import { ProfesionalesService } from './profesionales.service';

describe('ProfesionalesService', () => {
  let service: ProfesionalesService;
  let profesionalesRepo: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
  };
  let horariosRepo: { create: jest.Mock; save: jest.Mock; find: jest.Mock };

  beforeEach(async () => {
    profesionalesRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    };
    horariosRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfesionalesService,
        {
          provide: getRepositoryToken(Profesional),
          useValue: profesionalesRepo,
        },
        {
          provide: getRepositoryToken(HorarioAtencion),
          useValue: horariosRepo,
        },
      ],
    }).compile();

    service = module.get<ProfesionalesService>(ProfesionalesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('estado', () => {
    it('devuelve el estado del módulo', () => {
      expect(service.estado()).toEqual({
        modulo: 'profesionales',
        estado: 'activo',
        cubre: ['soporte de Agenda'],
      });
    });
  });

  describe('crear', () => {
    it('crea y guarda un profesional', async () => {
      const dto = {
        usuarioId: 'user-1',
        especialidad: 'Dermatología',
        matricula: 'MP123',
      };
      const creado = { id: 'prof-1', ...dto };
      profesionalesRepo.create.mockReturnValue(creado);
      profesionalesRepo.save.mockResolvedValue(creado);

      const resultado = await service.crear(dto as any);

      expect(profesionalesRepo.create).toHaveBeenCalledWith(dto);
      expect(profesionalesRepo.save).toHaveBeenCalledWith(creado);
      expect(resultado).toEqual(creado);
    });
  });

  describe('listar', () => {
    it('devuelve todos los profesionales con sus horarios', async () => {
      const lista = [{ id: 'prof-1' }, { id: 'prof-2' }];
      profesionalesRepo.find.mockResolvedValue(lista);

      const resultado = await service.listar();

      expect(profesionalesRepo.find).toHaveBeenCalledWith({
        relations: ['horarios'],
      });
      expect(resultado).toEqual(lista);
    });
  });

  describe('buscarPorId', () => {
    it('devuelve el profesional si existe', async () => {
      const profesional = { id: 'prof-1', especialidad: 'Cardiología' };
      profesionalesRepo.findOne.mockResolvedValue(profesional);

      const resultado = await service.buscarPorId('prof-1');

      expect(profesionalesRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'prof-1' },
        relations: ['horarios'],
      });
      expect(resultado).toEqual(profesional);
    });

    it('lanza NotFoundException si no existe', async () => {
      profesionalesRepo.findOne.mockResolvedValue(null);

      await expect(service.buscarPorId('no-existe')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('agregarHorario', () => {
    it('valida que el profesional exista y guarda el horario', async () => {
      const profesional = { id: 'prof-1' };
      const dto = {
        diaSemana: DiaSemana.LUNES,
        horaInicio: '09:00',
        horaFin: '13:00',
      };
      const horarioCreado = {
        id: 'horario-1',
        profesionalId: 'prof-1',
        ...dto,
      };

      profesionalesRepo.findOne.mockResolvedValue(profesional);
      horariosRepo.create.mockReturnValue(horarioCreado);
      horariosRepo.save.mockResolvedValue(horarioCreado);

      const resultado = await service.agregarHorario('prof-1', dto as any);

      expect(profesionalesRepo.findOne).toHaveBeenCalled();
      expect(horariosRepo.create).toHaveBeenCalledWith({
        ...dto,
        profesionalId: 'prof-1',
      });
      expect(resultado).toEqual(horarioCreado);
    });

    it('lanza NotFoundException si el profesional no existe', async () => {
      profesionalesRepo.findOne.mockResolvedValue(null);
      const dto = {
        diaSemana: DiaSemana.LUNES,
        horaInicio: '09:00',
        horaFin: '13:00',
      };

      await expect(
        service.agregarHorario('no-existe', dto as any),
      ).rejects.toThrow(NotFoundException);
      expect(horariosRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('horariosDe', () => {
    it('filtra por profesionalId y día si se especifica', async () => {
      const horarios = [{ id: 'horario-1', diaSemana: DiaSemana.LUNES }];
      horariosRepo.find.mockResolvedValue(horarios);

      const resultado = await service.horariosDe('prof-1', DiaSemana.LUNES);

      expect(horariosRepo.find).toHaveBeenCalledWith({
        where: { profesionalId: 'prof-1', diaSemana: DiaSemana.LUNES },
      });
      expect(resultado).toEqual(horarios);
    });

    it('filtra solo por profesionalId si no se pasa día', async () => {
      horariosRepo.find.mockResolvedValue([]);

      await service.horariosDe('prof-1');

      expect(horariosRepo.find).toHaveBeenCalledWith({
        where: { profesionalId: 'prof-1' },
      });
    });
  });
});
