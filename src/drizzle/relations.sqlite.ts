import { relations } from "drizzle-orm/relations";
import {
  apps,
  clients,
  appsOnline,
  libraries,
  appUsers,
  appPages,
  appAssets,
  libraryTemplates,
  appPagesOnline,
  libraryItems,
  aiLogs,
} from "./schema.sqlite";

export const appsRelations = relations(apps, ({ one, many }) => ({
  client: one(clients, {
    fields: [apps.client],
    references: [clients.id],
  }),
  libraries: many(libraries),
  appUsers: many(appUsers),
  appPages: many(appPages),
  appAssets: many(appAssets),
  appPagesOnlines: many(appPagesOnline),
  aiLogs: many(aiLogs),
}));

export const clientsRelations = relations(clients, ({ many }) => ({
  apps: many(apps),
  appsOnlines: many(appsOnline),
  aiLogs: many(aiLogs),
}));

export const appsOnlineRelations = relations(appsOnline, ({ one }) => ({
  client: one(clients, {
    fields: [appsOnline.client],
    references: [clients.id],
  }),
}));

export const librariesRelations = relations(libraries, ({ one, many }) => ({
  app: one(apps, {
    fields: [libraries.app],
    references: [apps.id],
  }),
  libraryTemplates: many(libraryTemplates),
  libraryItems: many(libraryItems),
}));

export const appUsersRelations = relations(appUsers, ({ one }) => ({
  app: one(apps, {
    fields: [appUsers.app],
    references: [apps.id],
  }),
}));

export const appPagesRelations = relations(appPages, ({ one, many }) => ({
  app: one(apps, {
    fields: [appPages.app],
    references: [apps.id],
  }),
  appPage: one(appPages, {
    fields: [appPages.parent],
    references: [appPages.id],
    relationName: "appPages_parent_appPages_id",
  }),
  appPages: many(appPages, {
    relationName: "appPages_parent_appPages_id",
  }),
}));

export const appAssetsRelations = relations(appAssets, ({ one }) => ({
  app: one(apps, {
    fields: [appAssets.app],
    references: [apps.id],
  }),
}));

export const libraryTemplatesRelations = relations(libraryTemplates, ({ one }) => ({
  library: one(libraries, {
    fields: [libraryTemplates.library],
    references: [libraries.id],
  }),
}));

export const appPagesOnlineRelations = relations(appPagesOnline, ({ one }) => ({
  app: one(apps, {
    fields: [appPagesOnline.app],
    references: [apps.id],
  }),
}));

export const libraryItemsRelations = relations(libraryItems, ({ one }) => ({
  library: one(libraries, {
    fields: [libraryItems.library],
    references: [libraries.id],
  }),
}));

export const aiLogsRelations = relations(aiLogs, ({ one }) => ({
  app: one(apps, {
    fields: [aiLogs.app],
    references: [apps.id],
  }),
  client: one(clients, {
    fields: [aiLogs.client],
    references: [clients.id],
  }),
}));
