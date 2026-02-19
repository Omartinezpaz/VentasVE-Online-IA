import prisma from '@ventasve/database';
import { AppError, Errors } from '../lib/errors';

interface CreateProductInput {
  businessId: string;
  name: string;
  description?: string;
  priceUsdCents: number;
  categoryId?: string;
  images?: string[];
  stock?: number;
  variants?: any;
  attributes?: any;
  isPublished?: boolean;
}

interface UpdateProductInput {
  name?: string;
  description?: string;
  priceUsdCents?: number;
  categoryId?: string;
  images?: string[];
  stock?: number;
  variants?: any;
  attributes?: any;
  isPublished?: boolean;
}

interface ProductQuery {
  page?: number;
  limit?: number;
  categoryId?: string;
  search?: string;
  isPublished?: boolean; // 'true', 'false', undefined
}

export class ProductsService {
  
  async create(data: CreateProductInput) {
    // Optional: Validate category belongs to business
    if (data.categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: data.categoryId, businessId: data.businessId },
      });
      if (!category) {
        throw Errors.Validation('La categoría seleccionada no existe o no pertenece a este negocio');
      }
    }

    const product = await prisma.product.create({
      data: {
        businessId: data.businessId,
        name: data.name,
        description: data.description,
        priceUsdCents: data.priceUsdCents,
        categoryId: data.categoryId,
        images: data.images || [],
        stock: data.stock || 0,
        variants: data.variants || [],
        attributes: data.attributes || {},
        isPublished: data.isPublished ?? true,
      },
    });

    return product;
  }

  async findAll(businessId: string, query: ProductQuery) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      businessId,
      deletedAt: null, // Soft delete check
    };

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.isPublished !== undefined) {
      where.isPublished = query.isPublished;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await prisma.$transaction([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { category: true },
      }),
      prisma.product.count({ where }),
    ]);

    return {
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(businessId: string, productId: string) {
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        businessId,
        deletedAt: null,
      },
      include: { category: true },
    });

    if (!product) {
      throw Errors.NotFound('Producto');
    }

    return product;
  }

  async update(businessId: string, productId: string, data: UpdateProductInput) {
    // Check existence
    await this.findOne(businessId, productId);

    // Optional: Validate category if updating
    if (data.categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: data.categoryId, businessId },
      });
      if (!category) {
        throw Errors.Validation('La categoría seleccionada no existe');
      }
    }

    const product = await prisma.product.update({
      where: { id: productId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    return product;
  }

  async delete(businessId: string, productId: string) {
    // Check existence
    await this.findOne(businessId, productId);

    // Soft delete
    await prisma.product.update({
      where: { id: productId },
      data: {
        deletedAt: new Date(),
      },
    });

    return { success: true };
  }

  async updateStock(businessId: string, productId: string, stockChange: number) {
    // stockChange can be positive (add) or negative (subtract)
    // or we can just set absolute stock. Let's assume absolute stock for this method based on typical "update" behavior,
    // or implement an "adjust" method. 
    // Usually a simple update is easier.
    // Let's assume the controller sends the new absolute stock value.
    
    return this.update(businessId, productId, { stock: stockChange });
  }
}

export const productsService = new ProductsService();
