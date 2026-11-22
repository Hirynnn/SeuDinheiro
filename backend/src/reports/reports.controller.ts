import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { CurrentCompanyId } from '../common/decorators/current-company.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';

@ApiTags('Relatórios Financeiros')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dre')
  @RequirePermissions('reports.view')
  @ApiOperation({ summary: 'Demonstração do Resultado do Exercício (DRE)' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiQuery({ name: 'month', required: false, type: Number })
  async getDre(
    @CurrentCompanyId() companyId: string,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const currentYear = year ? parseInt(year, 10) : new Date().getFullYear();
    const currentMonth = month ? parseInt(month, 10) : undefined;
    return this.reportsService.getDre(companyId, currentYear, currentMonth);
  }

  @Get('overdue')
  @RequirePermissions('reports.view')
  @ApiOperation({ summary: 'Relatório de contas a receber vencidas (inadimplência)' })
  async getOverdue(@CurrentCompanyId() companyId: string) {
    return this.reportsService.getOverdueReceivables(companyId);
  }

  @Get('export/csv')
  @RequirePermissions('reports.export')
  @ApiOperation({ summary: 'Exporta os lançamentos em arquivo CSV formatado' })
  async exportCsv(
    @CurrentCompanyId() companyId: string,
    @Res() res: Response,
  ) {
    return this.reportsService.exportTransactionsCsv(companyId, res);
  }
}
