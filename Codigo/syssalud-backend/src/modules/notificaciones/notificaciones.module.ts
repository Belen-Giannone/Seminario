import { Module } from '@nestjs/common';
import { NotificacionesController } from './notificaciones.controller';
import { NotificacionesService } from './notificaciones.service';

/**
 * Módulo Notificaciones — transversal. Todos los `notif_*` de los diccionarios
 * de datos (registro, confirmación, cancelación, reprogramación) pasan por acá.
 */
@Module({
  controllers: [NotificacionesController],
  providers: [NotificacionesService],
  exports: [NotificacionesService],
})
export class NotificacionesModule {}
