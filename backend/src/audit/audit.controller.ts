import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { CurrentCompanyId } from '../common/decorators/current-company.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';

@ApiTags('Auditoria do Sistema')
@ApiBearerAuth()
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermissions('audit.view')
  @ApiOperation({ summary: 'Consulta o histórico de auditoria da empresa' })
  @ApiQuery({ name: 'entity', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listLogs(
    @CurrentCompanyId() companyId: string,
    @Query('entity') entity?: string,
    @Query('limit') limit?: string,
  ) {
    const take = limit ? parseInt(limit, 10) : 50;
    return this.auditService.listCompanyLogs(companyId, entity, take);
  }
}
