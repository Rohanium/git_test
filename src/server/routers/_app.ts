import { createTRPCRouter } from "../trpc";
import { crmRouter } from "./crm";
import { quotesRouter } from "./quotes";
import { ordersRouter } from "./orders";
import { inventoryRouter } from "./inventory";
import { productionRouter } from "./production";
import { financeRouter } from "./finance";
import { qualityRouter } from "./quality";
import { deliveryRouter } from "./delivery";
import { hrRouter } from "./hr";
import { reportsRouter } from "./reports";

export const appRouter = createTRPCRouter({
  crm: crmRouter,
  quotes: quotesRouter,
  orders: ordersRouter,
  inventory: inventoryRouter,
  production: productionRouter,
  finance: financeRouter,
  quality: qualityRouter,
  delivery: deliveryRouter,
  hr: hrRouter,
  reports: reportsRouter,
});

export type AppRouter = typeof appRouter;
