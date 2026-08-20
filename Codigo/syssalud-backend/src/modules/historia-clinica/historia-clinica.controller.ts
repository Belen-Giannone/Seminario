import { Controller, Get } from '@nestjs/common';
import { HistoriaClinicaService } from './historia-clinica.service';

@Controller('historia-clinica')
export class HistoriaClinicaController {
  constructor(private readonly historiaClinicaService: HistoriaClinicaService) {}

  @Get()
  estado() {
    return this.historiaClinicaService.estado();
  }
}
