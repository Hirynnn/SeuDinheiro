import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CategoryType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, dto: CreateCategoryDto) {
    const existing = await this.prisma.category.findUnique({
      where: {
        companyId_name_type: {
          companyId,
          name: dto.name,
          type: dto.type,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Já existe uma categoria de ${dto.type === 'REVENUE' ? 'receita' : 'despesa'} com o nome '${dto.name}'.`,
      );
    }

    return this.prisma.category.create({
      data: {
        companyId,
        name: dto.name,
        type: dto.type,
        description: dto.description,
      },
    });
  }

  async list(companyId: string, type?: CategoryType) {
    return this.prisma.category.findMany({
      where: {
        companyId,
        isActive: true,
        ...(type ? { type } : {}),
      },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(companyId: string, id: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, companyId },
    });

    if (!category) {
      throw new NotFoundException('Categoria não encontrada.');
    }

    return category;
  }

  async update(companyId: string, id: string, dto: UpdateCategoryDto) {
    await this.findOne(companyId, id);

    return this.prisma.category.update({
      where: { id },
      data: dto,
    });
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);

    // Desativação lógica
    return this.prisma.category.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
