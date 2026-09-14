import { IsUUID } from 'class-validator';
import { CrearPacienteDto } from './crear-paciente.dto';

export class AltaPerfilPacienteDto extends CrearPacienteDto {
  @IsUUID('4', { message: 'usuarioId debe ser un UUID válido.' })
  usuarioId: string;
}
