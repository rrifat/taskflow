import { prisma } from "@/lib/db/client";
import type { CategoryDirection } from "@/lib/board/category-order";

export async function listCategoriesByUserId(userId: string) {
  return prisma.category.findMany({
    where: { userId },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      order: true,
      tickets: {
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          title: true,
          description: true,
          expiryDate: true,
          order: true,
          history: {
            orderBy: {
              createdAt: "desc",
            },
            take: 10,
            select: {
              id: true,
              type: true,
              fromCategoryId: true,
              toCategoryId: true,
              changedFields: true,
              createdAt: true,
            },
          },
        },
      },
      _count: {
        select: {
          tickets: true,
        },
      },
    },
  });
}

export async function createCategoryForUser({
  userId,
  name,
}: {
  userId: string;
  name: string;
}) {
  return prisma.$transaction(async (tx) => {
    const lastCategory = await tx.category.findFirst({
      where: { userId },
      orderBy: [{ order: "desc" }, { createdAt: "desc" }],
      select: {
        order: true,
      },
    });

    return tx.category.create({
      data: {
        userId,
        name,
        order: (lastCategory?.order ?? -1) + 1,
      },
      select: {
        id: true,
        name: true,
        order: true,
      },
    });
  });
}

export async function moveCategoryForUser({
  categoryId,
  userId,
  direction,
}: {
  categoryId: string;
  userId: string;
  direction: CategoryDirection;
}) {
  return prisma.$transaction(async (tx) => {
    const categories = await tx.category.findMany({
      where: { userId },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        order: true,
      },
    });

    const currentIndex = categories.findIndex(
      (category) => category.id === categoryId,
    );

    if (currentIndex === -1) {
      return null;
    }

    const targetIndex =
      direction === "left" ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= categories.length) {
      return { id: categoryId, unchanged: true as const };
    }

    const currentCategory = categories[currentIndex];
    const targetCategory = categories[targetIndex];

    await Promise.all([
      tx.category.update({
        where: { id: currentCategory.id },
        data: { order: targetCategory.order },
      }),
      tx.category.update({
        where: { id: targetCategory.id },
        data: { order: currentCategory.order },
      }),
    ]);

    return { id: categoryId, unchanged: false as const };
  });
}

export async function deleteCategoryForUser({
  categoryId,
  userId,
}: {
  categoryId: string;
  userId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const category = await tx.category.findFirst({
      where: {
        id: categoryId,
        userId,
      },
      select: {
        id: true,
        _count: {
          select: {
            tickets: true,
          },
        },
      },
    });

    if (!category) {
      return null;
    }

    if (category._count.tickets > 0) {
      return { id: categoryId, blocked: true as const };
    }

    await tx.category.delete({
      where: {
        id: categoryId,
      },
    });

    const remainingCategories = await tx.category.findMany({
      where: { userId },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
      },
    });

    await Promise.all(
      remainingCategories.map((remainingCategory, index) =>
        tx.category.update({
          where: { id: remainingCategory.id },
          data: { order: index },
        }),
      ),
    );

    return { id: categoryId, blocked: false as const };
  });
}
