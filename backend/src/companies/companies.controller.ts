import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CompaniesService } from './companies.service';
import { AddMemberDto, UpdateCompanyDto, UpdateMemberRoleDto } from './dto/company.dto';
import { CurrentCompanyId } from '../common/decorators/current-company.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';

@ApiTags('Empresas & Membros (RBAC)')
@ApiBearerAuth()
@Controller('companies/current')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  @ApiOperation({ summary: 'Obtém dados da empresa ativa' })
  async getCurrent(@CurrentCompanyId() companyId: string) {
    return this.companiesService.getCurrentCompany(companyId);
  }

  @Patch()
  @RequirePermissions('settings.edit')
  @ApiOperation({ summary: 'Atualiza dados cadastrais da empresa' })
  async updateCurrent(
    @CurrentCompanyId() companyId: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companiesService.updateCurrentCompany(companyId, dto);
  }

  @Get('members')
  @RequirePermissions('users.view')
  @ApiOperation({ summary: 'Lista os membros e seus papéis na empresa' })
  async listMembers(@CurrentCompanyId() companyId: string) {
    return this.companiesService.listMembers(companyId);
  }

  @Post('members')
  @RequirePermissions('users.create')
  @ApiOperation({ summary: 'Adiciona um novo membro à empresa com papel' })
  async addMember(
    @CurrentCompanyId() companyId: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.companiesService.addMember(companyId, dto);
  }

  @Patch('members/:id/role')
  @RequirePermissions('users.edit')
  @ApiOperation({ summary: 'Atualiza o papel de um membro da empresa' })
  async updateMemberRole(
    @CurrentCompanyId() companyId: string,
    @Param('id') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.companiesService.updateMemberRole(companyId, memberId, dto, userId);
  }

  @Delete('members/:id')
  @RequirePermissions('users.edit')
  @ApiOperation({ summary: 'Remove/desativa o acesso de um membro' })
  async removeMember(
    @CurrentCompanyId() companyId: string,
    @Param('id') memberId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.companiesService.removeMember(companyId, memberId, userId);
  }
}
