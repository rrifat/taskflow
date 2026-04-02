import { prisma } from "@/lib/db/client";

export async function listCategoriesByUserId(userId: string) {
  return prisma.category.findMany({
    where: { userId },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      order: true,
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
