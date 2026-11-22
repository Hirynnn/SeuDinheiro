import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReconciliationService } from './reconciliation.service';
import { CurrentCompanyId } from '../common/decorators/current-company.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';

@ApiTags('Conciliação Bancária por Extrato CSV')
@ApiBearerAuth()
@Controller('reconciliation')
export class ReconciliationController {
  constructor(private readonly reconciliationService: ReconciliationService) {}

  @Post('import')
  @RequirePermissions('reconciliation.manage')
  @ApiOperation({ summary: 'Importa um arquivo CSV de extrato bancário com auto-match' })
  async importStatement(
    @CurrentCompanyId() companyId: string,
    @CurrentUser('id') userId: string,
    @Body()
    dto: {
      financialAccountId: string;
      fileName: string;
      csvContent: string;
    },
  ) {
    return this.reconciliationService.importStatement(companyId, userId, dto);
  }

  @Get('statements')
  @RequirePermissions('reconciliation.view')
  @ApiOperation({ summary: 'Lista os extratos importados' })
  async listStatements(@CurrentCompanyId() companyId: string) {
    return this.reconciliationService.listStatements(companyId);
  }

  @Get('statements/:id')
  @RequirePermissions('reconciliation.view')
  @ApiOperation({ summary: 'Obtém detalhes do extrato e status de conciliação das linhas' })
  async getStatement(
    @CurrentCompanyId() companyId: string,
    @Param('id') statementId: string,
  ) {
    return this.reconciliationService.getStatementDetails(companyId, statementId);
  }

  @Post('match')
  @RequirePermissions('reconciliation.manage')
  @ApiOperation({ summary: 'Associa manualmente uma linha de extrato a um lançamento' })
  async match(
    @CurrentCompanyId() companyId: string,
    @CurrentUser('id') userId: string,
    @Body()
    dto: {
      statementLineId: string;
      transactionId: string;
    },
  ) {
    return this.reconciliationService.manualMatch(
      companyId,
      dto.statementLineId,
      dto.transactionId,
      userId,
    );
  }
}
