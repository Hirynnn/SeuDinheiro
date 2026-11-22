import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ContactsService } from './contacts.service';
import { CreateCustomerDto, CreateSupplierDto } from './dto/contact.dto';
import { CurrentCompanyId } from '../common/decorators/current-company.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';

@ApiTags('Clientes & Fornecedores')
@ApiBearerAuth()
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post('customers')
  @RequirePermissions('customers.create')
  @ApiOperation({ summary: 'Cadastra um novo cliente' })
  async createCustomer(
    @CurrentCompanyId() companyId: string,
    @Body() dto: CreateCustomerDto,
  ) {
    return this.contactsService.createCustomer(companyId, dto);
  }

  @Get('customers')
  @RequirePermissions('customers.view')
  @ApiOperation({ summary: 'Lista todos os clientes da empresa' })
  async listCustomers(@CurrentCompanyId() companyId: string) {
    return this.contactsService.listCustomers(companyId);
  }

  @Post('suppliers')
  @RequirePermissions('suppliers.create')
  @ApiOperation({ summary: 'Cadastra um novo fornecedor' })
  async createSupplier(
    @CurrentCompanyId() companyId: string,
    @Body() dto: CreateSupplierDto,
  ) {
    return this.contactsService.createSupplier(companyId, dto);
  }

  @Get('suppliers')
  @RequirePermissions('suppliers.view')
  @ApiOperation({ summary: 'Lista todos os fornecedores da empresa' })
  async listSuppliers(@CurrentCompanyId() companyId: string) {
    return this.contactsService.listSuppliers(companyId);
  }
}
