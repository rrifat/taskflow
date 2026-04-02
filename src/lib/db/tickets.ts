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

export async function updateTicketForUser({
  ticketId,
  userId,
  title,
  description,
  expiryDate,
}: {
  ticketId: string;
  userId: string;
  title: string;
  description: string;
  expiryDate: Date;
}) {
  const existingTicket = await prisma.ticket.findFirst({
    where: {
      id: ticketId,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!existingTicket) {
    return null;
  }

  return prisma.ticket.update({
    where: {
      id: ticketId,
    },
    data: {
      title,
      description,
      expiryDate,
    },
    select: {
      id: true,
      title: true,
      description: true,
      expiryDate: true,
      order: true,
    },
  });
}

export async function moveTicketForUser({
  ticketId,
  userId,
  destinationCategoryId,
  destinationIndex,
}: {
  ticketId: string;
  userId: string;
  destinationCategoryId: string;
  destinationIndex: number;
}) {
  return prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.findFirst({
      where: {
        id: ticketId,
        userId,
      },
      select: {
        id: true,
        categoryId: true,
      },
    });

    if (!ticket) {
      return null;
    }

    const destinationCategory = await tx.category.findFirst({
      where: {
        id: destinationCategoryId,
        userId,
      },
      select: {
        id: true,
      },
    });

    if (!destinationCategory) {
      return null;
    }

    const sourceTickets = await tx.ticket.findMany({
      where: {
        userId,
        categoryId: ticket.categoryId,
      },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
      },
    });

    const destinationTickets =
      ticket.categoryId === destinationCategoryId
        ? sourceTickets
        : await tx.ticket.findMany({
            where: {
              userId,
              categoryId: destinationCategoryId,
            },
            orderBy: [{ order: "asc" }, { createdAt: "asc" }],
            select: {
              id: true,
            },
          });

    if (ticket.categoryId === destinationCategoryId) {
      const nextTickets = sourceTickets.filter(
        (sourceTicket) => sourceTicket.id !== ticketId,
      );
      const clampedIndex = Math.min(
        Math.max(destinationIndex, 0),
        nextTickets.length,
      );

      nextTickets.splice(clampedIndex, 0, { id: ticketId });

      await Promise.all(
        nextTickets.map((nextTicket, index) =>
          tx.ticket.update({
            where: { id: nextTicket.id },
            data: {
              order: index,
            },
          }),
        ),
      );

      return { id: ticketId };
    }

    const nextSourceTickets = sourceTickets.filter(
      (sourceTicket) => sourceTicket.id !== ticketId,
    );
    const nextDestinationTickets = [...destinationTickets];
    const clampedIndex = Math.min(
      Math.max(destinationIndex, 0),
      nextDestinationTickets.length,
    );

    nextDestinationTickets.splice(clampedIndex, 0, { id: ticketId });

    await Promise.all(
      nextSourceTickets.map((sourceTicket, index) =>
        tx.ticket.update({
          where: { id: sourceTicket.id },
          data: {
            order: index,
          },
        }),
      ),
    );

    await Promise.all(
      nextDestinationTickets.map((destinationTicket, index) =>
        tx.ticket.update({
          where: { id: destinationTicket.id },
          data: {
            categoryId: destinationCategoryId,
            order: index,
          },
        }),
      ),
    );

    return { id: ticketId };
  });
}
