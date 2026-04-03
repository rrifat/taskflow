import test from "node:test";
import assert from "node:assert/strict";

import { getTicketExpiryLabel, getTicketExpiryState } from "./ticket-expiry";

const referenceTime = Date.parse("2026-04-03T12:00:00.000Z");

test("marks past dates as overdue", () => {
  const past = new Date(referenceTime - 1000 * 60).toISOString();

  assert.equal(getTicketExpiryState(past, referenceTime), "overdue");
  assert.equal(getTicketExpiryLabel(past, referenceTime), "Overdue");
});

test("marks dates within 48 hours as due soon", () => {
  const soon = new Date(referenceTime + 1000 * 60 * 60 * 24).toISOString();

  assert.equal(getTicketExpiryState(soon, referenceTime), "dueSoon");
  assert.equal(getTicketExpiryLabel(soon, referenceTime), "Due Soon");
});

test("marks later dates as on track", () => {
  const later = new Date(
    referenceTime + 1000 * 60 * 60 * 24 * 5,
  ).toISOString();

  assert.equal(getTicketExpiryState(later, referenceTime), "normal");
  assert.equal(getTicketExpiryLabel(later, referenceTime), "On Track");
});
