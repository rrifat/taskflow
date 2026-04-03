export type DragState = {
  ticketId: string;
  sourceCategoryId: string;
  sourceIndex: number;
};

export type DropTarget = {
  categoryId: string;
  index: number;
};

type TicketLike = {
  id: string;
  order: number;
};

type CategoryLike<TTicket extends TicketLike> = {
  id: string;
  tickets: TTicket[];
  _count?: {
    tickets: number;
  };
};

export function moveTicketInCategories<
  TTicket extends TicketLike,
  TCategory extends CategoryLike<TTicket>,
>(
  categories: TCategory[],
  draggedTicketId: string,
  sourceCategoryId: string,
  destinationCategoryId: string,
  destinationIndex: number,
) {
  const nextCategories = categories.map((category) => ({
    ...category,
    tickets: [...category.tickets],
  }));

  const sourceCategory = nextCategories.find(
    (category) => category.id === sourceCategoryId,
  );
  const destinationCategory = nextCategories.find(
    (category) => category.id === destinationCategoryId,
  );

  if (!sourceCategory || !destinationCategory) {
    return categories;
  }

  const draggedTicket = sourceCategory.tickets.find(
    (ticket) => ticket.id === draggedTicketId,
  );

  if (!draggedTicket) {
    return categories;
  }

  sourceCategory.tickets = sourceCategory.tickets.filter(
    (ticket) => ticket.id !== draggedTicketId,
  );

  const clampedIndex = Math.min(
    Math.max(destinationIndex, 0),
    destinationCategory.tickets.length,
  );

  destinationCategory.tickets.splice(clampedIndex, 0, {
    ...draggedTicket,
  });

  nextCategories.forEach((category) => {
    category.tickets = category.tickets.map((ticket, index) => ({
      ...ticket,
      order: index,
    }));

    if (category._count) {
      category._count = {
        tickets: category.tickets.length,
      };
    }
  });

  return nextCategories;
}

export function getNormalizedDropTarget<
  TTicket extends TicketLike,
  TCategory extends CategoryLike<TTicket>,
>(categories: TCategory[], dragState: DragState, dropTarget: DropTarget) {
  const sourceCategory = categories.find(
    (category) => category.id === dragState.sourceCategoryId,
  );

  if (!sourceCategory) {
    return null;
  }

  let nextIndex = dropTarget.index;

  if (
    dropTarget.categoryId === dragState.sourceCategoryId &&
    nextIndex > dragState.sourceIndex
  ) {
    nextIndex -= 1;
  }

  const destinationCategory = categories.find(
    (category) => category.id === dropTarget.categoryId,
  );

  if (!destinationCategory) {
    return null;
  }

  const clampedIndex = Math.min(
    Math.max(nextIndex, 0),
    destinationCategory.tickets.length -
      (dropTarget.categoryId === dragState.sourceCategoryId ? 1 : 0),
  );

  if (
    dropTarget.categoryId === dragState.sourceCategoryId &&
    clampedIndex === dragState.sourceIndex
  ) {
    return null;
  }

  return {
    categoryId: dropTarget.categoryId,
    index: clampedIndex,
  };
}
