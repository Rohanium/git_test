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
import { projectsRouter } from "./projects";
import { capacityRouter } from "./capacity";

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
  projects: projectsRouter,
  capacity: capacityRouter,
});

export type AppRouter = typeof appRouter;
