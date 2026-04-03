import { TicketHistoryType } from "@generated/prisma/client";

import { prisma } from "@/lib/db/client";

type TicketChangedFields = Record<
  string,
  {
    from: string;
    to: string;
  }
>;

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

    const ticket = await tx.ticket.create({
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

    await tx.ticketHistory.create({
      data: {
        ticketId: ticket.id,
        actorUserId: userId,
        type: TicketHistoryType.CREATED,
        toCategoryId: categoryId,
      },
    });

    return ticket;
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
  return prisma.$transaction(async (tx) => {
    const existingTicket = await tx.ticket.findFirst({
      where: {
        id: ticketId,
        userId,
      },
      select: {
        id: true,
        title: true,
        description: true,
        expiryDate: true,
      },
    });

    if (!existingTicket) {
      return null;
    }

    const changedFields: TicketChangedFields = {};

    if (existingTicket.title !== title) {
      changedFields.title = {
        from: existingTicket.title,
        to: title,
      };
    }

    if (existingTicket.description !== description) {
      changedFields.description = {
        from: existingTicket.description,
        to: description,
      };
    }

    const previousExpiryDate = existingTicket.expiryDate.toISOString();
    const nextExpiryDate = expiryDate.toISOString();

    if (previousExpiryDate !== nextExpiryDate) {
      changedFields.expiryDate = {
        from: previousExpiryDate,
        to: nextExpiryDate,
      };
    }

    const ticket = await tx.ticket.update({
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

    if (Object.keys(changedFields).length > 0) {
      await tx.ticketHistory.create({
        data: {
          ticketId,
          actorUserId: userId,
          type: TicketHistoryType.UPDATED,
          changedFields,
        },
      });
    }

    return ticket;
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

      const previousIndex = sourceTickets.findIndex(
        (sourceTicket) => sourceTicket.id === ticketId,
      );

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

      if (previousIndex !== clampedIndex) {
        await tx.ticketHistory.create({
          data: {
            ticketId,
            actorUserId: userId,
            type: TicketHistoryType.MOVED,
            fromCategoryId: ticket.categoryId,
            toCategoryId: destinationCategoryId,
            changedFields: {
              order: {
                from: String(previousIndex),
                to: String(clampedIndex),
              },
            },
          },
        });
      }

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

    await tx.ticketHistory.create({
      data: {
        ticketId,
        actorUserId: userId,
        type: TicketHistoryType.MOVED,
        fromCategoryId: ticket.categoryId,
        toCategoryId: destinationCategoryId,
        changedFields: {
          order: {
            from: String(sourceTickets.findIndex((sourceTicket) => sourceTicket.id === ticketId)),
            to: String(clampedIndex),
          },
        },
      },
    });

    return { id: ticketId };
  });
}
