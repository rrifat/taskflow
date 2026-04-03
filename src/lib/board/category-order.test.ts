import test from "node:test";
import assert from "node:assert/strict";

import { moveCategoryInBoard } from "./category-order";

function makeCategories() {
  return [
    { id: "backlog", order: 0 },
    { id: "doing", order: 1 },
    { id: "review", order: 2 },
  ];
}

test("moves a category left by one position", () => {
  const result = moveCategoryInBoard(makeCategories(), "doing", "left");

  assert.deepEqual(
    result.map((category) => `${category.id}:${category.order}`),
    ["doing:0", "backlog:1", "review:2"],
  );
});

test("moves a category right by one position", () => {
  const result = moveCategoryInBoard(makeCategories(), "doing", "right");

  assert.deepEqual(
    result.map((category) => `${category.id}:${category.order}`),
    ["backlog:0", "review:1", "doing:2"],
  );
});

test("does not move a category past the board edge", () => {
  const original = makeCategories();
  const result = moveCategoryInBoard(original, "backlog", "left");

  assert.equal(result, original);
});
