import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CategoryType } from '@prisma/client';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { CurrentCompanyId } from '../common/decorators/current-company.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';

@ApiTags('Categorias Financeiras')
@ApiBearerAuth()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @RequirePermissions('categories.create')
  @ApiOperation({ summary: 'Cadastra uma nova categoria de receita ou despesa' })
  async create(
    @CurrentCompanyId() companyId: string,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.categoriesService.create(companyId, dto);
  }

  @Get()
  @RequirePermissions('categories.view')
  @ApiOperation({ summary: 'Lista todas as categorias da empresa' })
  @ApiQuery({ name: 'type', required: false, enum: CategoryType })
  async list(
    @CurrentCompanyId() companyId: string,
    @Query('type') type?: CategoryType,
  ) {
    return this.categoriesService.list(companyId, type);
  }

  @Get(':id')
  @RequirePermissions('categories.view')
  @ApiOperation({ summary: 'Obtém detalhes de uma categoria' })
  async findOne(
    @CurrentCompanyId() companyId: string,
    @Param('id') id: string,
  ) {
    return this.categoriesService.findOne(companyId, id);
  }

  @Patch(':id')
  @RequirePermissions('categories.edit')
  @ApiOperation({ summary: 'Atualiza uma categoria' })
  async update(
    @CurrentCompanyId() companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(companyId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('categories.edit')
  @ApiOperation({ summary: 'Desativa uma categoria' })
  async remove(
    @CurrentCompanyId() companyId: string,
    @Param('id') id: string,
  ) {
    return this.categoriesService.remove(companyId, id);
  }
}
