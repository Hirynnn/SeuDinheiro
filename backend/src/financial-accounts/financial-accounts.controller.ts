import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { FinancialAccountsService } from './financial-accounts.service';
import {
  CreateAccountDto,
  TransferBetweenAccountsDto,
  UpdateAccountDto,
} from './dto/account.dto';
import { CurrentCompanyId } from '../common/decorators/current-company.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';

@ApiTags('Contas Financeiras & Transferências')
@ApiBearerAuth()
@Controller('accounts')
export class FinancialAccountsController {
  constructor(private readonly accountsService: FinancialAccountsService) {}

  @Post()
  @RequirePermissions('accounts.create')
  @ApiOperation({ summary: 'Cadastra uma nova conta financeira' })
  async create(
    @CurrentCompanyId() companyId: string,
    @Body() dto: CreateAccountDto,
  ) {
    return this.accountsService.create(companyId, dto);
  }

  @Get()
  @RequirePermissions('accounts.view')
  @ApiOperation({ summary: 'Lista todas as contas financeiras da empresa' })
  @ApiQuery({ name: 'includeArchived', required: false, type: Boolean })
  async list(
    @CurrentCompanyId() companyId: string,
    @Query('includeArchived') includeArchived?: string,
  ) {
    return this.accountsService.list(companyId, includeArchived === 'true');
  }

  @Get(':id')
  @RequirePermissions('accounts.view')
  @ApiOperation({ summary: 'Detalhes de uma conta financeira' })
  async findOne(
    @CurrentCompanyId() companyId: string,
    @Param('id') id: string,
  ) {
    return this.accountsService.findOne(companyId, id);
  }

  @Patch(':id')
  @RequirePermissions('accounts.edit')
  @ApiOperation({ summary: 'Atualiza nome ou status de arquivamento da conta' })
  async update(
    @CurrentCompanyId() companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.accountsService.update(companyId, id, dto);
  }

  @Get(':id/statement')
  @RequirePermissions('accounts.view')
  @ApiOperation({ summary: 'Obtém o extrato de movimentações da conta' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getStatement(
    @CurrentCompanyId() companyId: string,
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.accountsService.getStatement(companyId, id, startDate, endDate);
  }

  @Post('transfer')
  @RequirePermissions('transactions.create')
  @ApiOperation({ summary: 'Realiza transferência atômica entre duas contas' })
  async transfer(
    @CurrentCompanyId() companyId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: TransferBetweenAccountsDto,
  ) {
    return this.accountsService.transfer(companyId, userId, dto);
  }
}
