import { IsEnum, IsNotEmpty } from 'class-validator';
import { MetodoPago } from '@syssalud/shared-types';

export class PagarTurnoDto {
  @IsEnum(MetodoPago, { message: 'El método de pago no es válido.' })
  metodoPago: MetodoPago;

  @IsNotEmpty({ message: 'El id de transacción es obligatorio.' })
  idTransaccion: string;
}
