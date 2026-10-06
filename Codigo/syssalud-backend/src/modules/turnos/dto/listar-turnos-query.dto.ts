import { IsEnum, IsISO8601, IsOptional, IsUUID } from 'class-validator';
import { EstadoTurno } from '@syssalud/shared-types';

export class ListarTurnosQueryDto {
  @IsOptional()
  @IsUUID()
  pacienteId?: string;

  @IsOptional()
  @IsUUID()
  profesionalId?: string;

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
