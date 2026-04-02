import { prisma } from "@/lib/db/client";

export async function createTicketForUser({
  userId,
  categoryId,
  title,
  description,
  expiryDate,
}: {
  userId: string;
  categoryId: string;
  title: string;
  description: string;
  expiryDate: Date;
}) {
  return prisma.$transaction(async (tx) => {
    const category = await tx.category.findFirst({
      where: {
        id: categoryId,
        userId,
      },
      select: {
        id: true,
      },
    });

    if (!category) {
      return null;
    }

    const lastTicket = await tx.ticket.findFirst({
      where: {
        userId,
        categoryId,
      },
      orderBy: [{ order: "desc" }, { createdAt: "desc" }],
      select: {
        order: true,
      },
    });

    return tx.ticket.create({
      data: {
        userId,
        categoryId,
        title,
        description,
        expiryDate,
        order: (lastTicket?.order ?? -1) + 1,
      },
      select: {
        id: true,
        title: true,
        description: true,
        expiryDate: true,
        order: true,
      },
    });
  });
}
