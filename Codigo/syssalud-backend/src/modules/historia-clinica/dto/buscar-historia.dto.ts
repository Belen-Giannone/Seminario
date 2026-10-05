import type { BuscarHistoriaQuery } from '@syssalud/shared-types';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

/** HCL-012: `criterio_busqueda = [dni_pac | (nom_pac + ape_pac)]`. */
export class BuscarHistoriaDto implements BuscarHistoriaQuery {
  @IsOptional()
  @IsString()
  @Matches(/^\d{6,10}$/, { message: 'El DNI debe tener entre 6 y 10 dígitos' })
  dni?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  apellido?: string;
}
