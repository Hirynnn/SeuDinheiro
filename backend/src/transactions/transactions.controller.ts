import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto, SettleTransactionDto } from './dto/transaction.dto';
import { QueryTransactionDto } from './dto/query-transaction.dto';
import { CurrentCompanyId } from '../common/decorators/current-company.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';

@ApiTags('Lançamentos Financeiros (Receitas & Despesas)')
@ApiBearerAuth()
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @RequirePermissions('transactions.create')
  @ApiOperation({ summary: 'Cria um novo lançamento financeiro (receita ou despesa)' })
  async create(
    @CurrentCompanyId() companyId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.transactionsService.create(companyId, userId, dto);
  }

  @Get()
  @RequirePermissions('transactions.view')
  @ApiOperation({ summary: 'Lista lançamentos com filtros avançados e paginação' })
  async list(
    @CurrentCompanyId() companyId: string,
    @Query() query: QueryTransactionDto,
  ) {
    return this.transactionsService.list(companyId, query);
  }

  @Get(':id')
  @RequirePermissions('transactions.view')
  @ApiOperation({ summary: 'Obtém detalhes de um lançamento, histórico e parcelas' })
  async findOne(
    @CurrentCompanyId() companyId: string,
    @Param('id') id: string,
  ) {
    return this.transactionsService.findOne(companyId, id);
  }

  @Post(':id/settle')
  @RequirePermissions('transactions.edit')
  @ApiOperation({ summary: 'Dá baixa de pagamento ou recebimento no lançamento' })
  async settle(
    @CurrentCompanyId() companyId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: SettleTransactionDto,
  ) {
    return this.transactionsService.settle(companyId, id, userId, dto);
  }

  @Delete(':id')
  @RequirePermissions('transactions.delete')
  @ApiOperation({ summary: 'Cancela um lançamento com estorno automático de saldo' })
  async remove(
    @CurrentCompanyId() companyId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.transactionsService.remove(companyId, id, userId);
  }
}
