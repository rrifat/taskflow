import test from "node:test";
import assert from "node:assert/strict";

import {
  getNormalizedDropTarget,
  moveTicketInCategories,
  type DragState,
} from "./ticket-dnd.ts";

type Ticket = {
  id: string;
  order: number;
};

type Category = {
  id: string;
  tickets: Ticket[];
  _count: {
    tickets: number;
  };
};

function makeCategories() {
  return [
    {
      id: "backlog",
      tickets: [
        { id: "a", order: 0 },
        { id: "b", order: 1 },
        { id: "c", order: 2 },
      ],
      _count: { tickets: 3 },
    },
    {
      id: "doing",
      tickets: [
        { id: "d", order: 0 },
        { id: "e", order: 1 },
      ],
      _count: { tickets: 2 },
    },
  ] satisfies Category[];
}

test("normalizes same-column downward drops to post-removal index", () => {
  const categories = makeCategories();
  const dragState: DragState = {
    ticketId: "a",
    sourceCategoryId: "backlog",
    sourceIndex: 0,
  };

  const target = getNormalizedDropTarget(categories, dragState, {
    categoryId: "backlog",
    index: 2,
  });

  assert.deepEqual(target, { categoryId: "backlog", index: 1 });
});

test("returns null for same-position no-op drops", () => {
  const categories = makeCategories();
  const dragState: DragState = {
    ticketId: "b",
    sourceCategoryId: "backlog",
    sourceIndex: 1,
  };

  const target = getNormalizedDropTarget(categories, dragState, {
    categoryId: "backlog",
    index: 1,
  });

  assert.equal(target, null);
});

test("reorders tickets downward within the same category", () => {
  const categories = makeCategories();

  const result = moveTicketInCategories(categories, "a", "backlog", "backlog", 1);

  assert.deepEqual(
    result.find((category) => category.id === "backlog")?.tickets.map(
      (ticket) => `${ticket.id}:${ticket.order}`,
    ),
    ["b:0", "a:1", "c:2"],
  );
});

test("reorders tickets upward within the same category", () => {
  const categories = makeCategories();

  const result = moveTicketInCategories(categories, "c", "backlog", "backlog", 0);

  assert.deepEqual(
    result.find((category) => category.id === "backlog")?.tickets.map(
      (ticket) => `${ticket.id}:${ticket.order}`,
    ),
    ["c:0", "a:1", "b:2"],
  );
});

test("moves a ticket across categories and updates both counts", () => {
  const categories = makeCategories();

  const result = moveTicketInCategories(categories, "b", "backlog", "doing", 1);
  const backlog = result.find((category) => category.id === "backlog");
  const doing = result.find((category) => category.id === "doing");

  assert.deepEqual(
    backlog?.tickets.map((ticket) => `${ticket.id}:${ticket.order}`),
    ["a:0", "c:1"],
  );
  assert.equal(backlog?._count.tickets, 2);

  assert.deepEqual(
    doing?.tickets.map((ticket) => `${ticket.id}:${ticket.order}`),
    ["d:0", "b:1", "e:2"],
  );
  assert.equal(doing?._count.tickets, 3);
});
