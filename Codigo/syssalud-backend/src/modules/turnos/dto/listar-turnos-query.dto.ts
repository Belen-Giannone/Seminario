import { IsEnum, IsISO8601, IsOptional, IsUUID } from 'class-validator';
import { EstadoTurno } from '@syssalud/shared-types';

export class ListarTurnosQueryDto {
  @IsOptional()
  @IsUUID()
  pacienteId?: string;

  @IsOptional()
  @IsUUID()
  profesionalId?: string;

  /** Lo usa Servicios para no dar de baja un servicio con turnos futuros (SER-019). */
  @IsOptional()
  @IsUUID()
  servicioId?: string;

  @IsOptional()
  @IsEnum(EstadoTurno)
  estado?: EstadoTurno;

  @IsOptional()
  @IsISO8601()
  desde?: string;

  @IsOptional()
  @IsISO8601()
  hasta?: string;
}
