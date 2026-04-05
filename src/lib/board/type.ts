import { type TicketChangedFields } from "@/lib/db/tickets";

export type Ticket = {
  id: string;
  title: string;
  description: string;
  expiryDate: string;
  order: number;
  history: {
    id: string;
    type: "CREATED" | "UPDATED" | "MOVED" | "DELETED";
    fromCategoryId: string | null;
    toCategoryId: string | null;
    changedFields: TicketChangedFields | null;
    createdAt: string;
  }[];
};

export type Category = {
  id: string;
  name: string;
  order: number;
  tickets: Ticket[];
  _count: {
    tickets: number;
  };
};

export type BoardColumnsProps = {
  categories: Category[];
  renderedAtMs: number;
  defaultTicketExpiryDate: string;
};
