import { Module } from '@nestjs/common';
import { PagosController } from './pagos.controller';
import { PagosService } from './pagos.service';

/** Módulo Pagos & Comprobantes — CUU06 y el pago dentro de CUU02 (RN11, RN20-23). */
@Module({
  controllers: [PagosController],
  providers: [PagosService],
  exports: [PagosService],
})
export class PagosModule {}
