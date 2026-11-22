import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { CurrentCompanyId } from '../common/decorators/current-company.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';

@ApiTags('Dashboard Financeiro')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @RequirePermissions('dashboard.view')
  @ApiOperation({ summary: 'Obtém todos os indicadores consolidados e gráficos do dashboard' })
  async getOverview(@CurrentCompanyId() companyId: string) {
    return this.dashboardService.getOverview(companyId);
  }
}
