import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CashFlowService } from './cash-flow.service';
import { CurrentCompanyId } from '../common/decorators/current-company.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';

@ApiTags('Fluxo de Caixa')
@ApiBearerAuth()
@Controller('cash-flow')
export class CashFlowController {
  constructor(private readonly cashFlowService: CashFlowService) {}

  @Get()
  @RequirePermissions('cashflow.view')
  @ApiOperation({ summary: 'Demonstrativo de fluxo de caixa realizado vs previsto' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Data inicial (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Data final (YYYY-MM-DD)' })
  async getCashFlow(
    @CurrentCompanyId() companyId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.cashFlowService.getCashFlow(companyId, startDate, endDate);
  }
}
