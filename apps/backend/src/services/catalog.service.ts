import prisma from '@ventasve/database';
import { getRedis } from '../lib/redis';

export class CatalogService {
  async getCatalogBySlug(slug: string) {
    const redis = getRedis();
    const key = `catalog:${slug}:info`;

    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached);
    }

    const business = await prisma.business.findUnique({
      where: { slug },
      include: {
        products: {
          where: { isPublished: true, deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 20
        }
      }
    });

    if (!business) {
      return null;
    }

    await redis.set(key, JSON.stringify(business), 'EX', 60);
    return business;
  }

  async getProducts(slug: string) {
    const redis = getRedis();
    const key = `catalog:${slug}:products`;

    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached);
    }

    const business = await prisma.business.findUnique({
      where: { slug },
      select: { id: true }
    });

    if (!business) {
      return null;
    }

    const products = await prisma.product.findMany({
      where: {
        businessId: business.id,
        isPublished: true,
        deletedAt: null
      },
      orderBy: { createdAt: 'desc' }
    });

    await redis.set(key, JSON.stringify(products), 'EX', 60);
    return products;
  }

  async getProductById(slug: string, productId: string) {
    const redis = getRedis();
    const key = `catalog:${slug}:product:${productId}`;

    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached);
    }

    const business = await prisma.business.findUnique({
      where: { slug },
      select: { id: true }
    });

    if (!business) {
      return null;
    }

    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        businessId: business.id,
        isPublished: true,
        deletedAt: null
      }
    });

    if (!product) {
      return null;
    }

    await redis.set(key, JSON.stringify(product), 'EX', 60);
    return product;
  }

  private async clearKeys(pattern: string) {
    const redis = getRedis();
    let cursor = '0';

    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length) {
        await redis.del(...keys);
      }
    } while (cursor !== '0');
  }

  async invalidateBySlug(slug: string) {
    await this.clearKeys(`catalog:${slug}:*`);
  }

  async invalidateByBusinessId(businessId: string) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { slug: true }
    });

    if (!business) {
      return;
    }

    await this.invalidateBySlug(business.slug);
  }
}

export const catalogService = new CatalogService();
