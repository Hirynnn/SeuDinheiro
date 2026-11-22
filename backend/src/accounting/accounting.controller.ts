import {
  Body,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AccountingService } from './accounting.service';
import {
  CreateAccountingAccountDto,
  CreateAccountingEntryDto,
} from './dto/accounting.dto';
import { CurrentCompanyId } from '../common/decorators/current-company.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';

@ApiTags('Contabilidade & Partidas Dobradas')
@ApiBearerAuth()
@Controller('accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Get('accounts')
  @RequirePermissions('accounting.view')
  @ApiOperation({ summary: 'Obtém o plano de contas e saldos contábeis' })
  async listAccounts(@CurrentCompanyId() companyId: string) {
    return this.accountingService.listAccounts(companyId);
  }

  @Post('accounts')
  @RequirePermissions('accounting.create')
  @ApiOperation({ summary: 'Cadastra uma nova conta no plano de contas' })
  async createAccount(
    @CurrentCompanyId() companyId: string,
    @Body() dto: CreateAccountingAccountDto,
  ) {
    return this.accountingService.createAccount(companyId, dto);
  }

  @Post('entries')
  @RequirePermissions('accounting.create')
  @ApiOperation({ summary: 'Cria um lançamento contábil em partidas dobradas' })
  async createEntry(
    @CurrentCompanyId() companyId: string,
    @Body() dto: CreateAccountingEntryDto,
  ) {
    return this.accountingService.createEntry(companyId, dto);
  }

  @Get('entries')
  @RequirePermissions('accounting.view')
  @ApiOperation({ summary: 'Lista os lançamentos contábeis' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async listEntries(
    @CurrentCompanyId() companyId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.accountingService.listEntries(companyId, startDate, endDate);
  }
}
