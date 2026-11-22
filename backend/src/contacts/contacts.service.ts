import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto, CreateSupplierDto } from './dto/contact.dto';

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Clientes ----
  async createCustomer(companyId: string, dto: CreateCustomerDto) {
    return this.prisma.customer.create({
      data: { companyId, ...dto },
    });
  }

  async listCustomers(companyId: string) {
    return this.prisma.customer.findMany({
      where: { companyId, isActive: true },
      include: {
        _count: { select: { transactions: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  // ---- Fornecedores ----
  async createSupplier(companyId: string, dto: CreateSupplierDto) {
    return this.prisma.supplier.create({
      data: { companyId, ...dto },
    });
  }

  async listSuppliers(companyId: string) {
    return this.prisma.supplier.findMany({
      where: { companyId, isActive: true },
      include: {
        _count: { select: { transactions: true } },
      },
      orderBy: { name: 'asc' },
    });
  }
}
