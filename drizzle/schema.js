import { relations, sql } from "drizzle-orm";
import {
  boolean,
  int,
  mysqlTable,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

// session table
export const sessionsTable = mysqlTable("sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  valid: boolean("valid").notNull().default(true), // ✅ default value
  userAgent: varchar("user_agent", { length: 255 }),
  ip: varchar("ip", { length: 45 }), // IPv6 length 45
  createdAt: timestamp("created_at").defaultNow().notNull(), // ✅ default now
});

export const verifyEmailsTokenTable = mysqlTable("is_email_valid", {
  id: int().autoincrement().notNull().primaryKey(),
  userId: int("user_id").references(() => usersTable.id, {
    onDelete: "cascade",
  }),
  token: varchar({ length: 8 }).notNull(),
  expiresAt: timestamp("expires_at").default(
    sql`(CURRENT_TIMESTAMP + INTERVAL 1 DAY)`
  ),
  createAt: timestamp("created_at").defaultNow().notNull(),
});

// Users table first
export const usersTable = mysqlTable("users", {
  id: int().autoincrement().primaryKey(),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  password: varchar({ length: 255 }).notNull(),
  isEmailValid: boolean("is_email_valid").default(false).notNull(),
  createAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

// Then shortener links table
export const shortenerLinksTable = mysqlTable("url_shortener", {
  id: int().autoincrement().primaryKey(),
  url: varchar({ length: 255 }).notNull(),
  shortCode: varchar("short_code", { length: 20 }).notNull().unique(),
  userId: int("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }), // ✅ reference works fine now
});

// Relations
export const usersRelation = relations(usersTable, ({ many }) => ({
  shortLinks: many(shortenerLinksTable),
  sessions: many(sessionsTable),
}));

export const shortLinksRelation = relations(shortenerLinksTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [shortenerLinksTable.userId],
    references: [usersTable.id],
  }),
}));

export const sessionsRelations = relations(sessionsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [sessionsTable.userId],
    references: [usersTable.id],
  }),
}));
