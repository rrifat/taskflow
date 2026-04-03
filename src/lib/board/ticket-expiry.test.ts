import test from "node:test";
import assert from "node:assert/strict";

import {
  getTicketExpiryLabel,
  getTicketExpiryState,
} from "./ticket-expiry.ts";

test("marks past dates as overdue", () => {
  const past = new Date(Date.now() - 1000 * 60).toISOString();

  assert.equal(getTicketExpiryState(past), "overdue");
  assert.equal(getTicketExpiryLabel(past), "Overdue");
});

test("marks dates within 48 hours as due soon", () => {
  const soon = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();

  assert.equal(getTicketExpiryState(soon), "dueSoon");
  assert.equal(getTicketExpiryLabel(soon), "Due Soon");
});

test("marks later dates as on track", () => {
  const later = new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString();

  assert.equal(getTicketExpiryState(later), "normal");
  assert.equal(getTicketExpiryLabel(later), "On Track");
});
