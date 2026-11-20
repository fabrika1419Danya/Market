import {
  pgTable,
  serial,
  varchar,
  text,
  numeric,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export type GameCategory = "Аккаунты" | "Валюта" | "Услуги" | "Предметы";
export type OrderStatus = "paid" | "completed" | "disputed" | "refunded";

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    username: varchar("username", { length: 64 }).notNull().unique(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    balance: numeric("balance", { precision: 12, scale: 2 })
      .notNull()
      .default("0.00"),
    avatar: text("avatar").notNull().default(""),
    bio: varchar("bio", { length: 300 }).notNull().default(""),
    rating: numeric("rating", { precision: 3, scale: 2 })
      .notNull()
      .default("0.00"),
    reviewsCount: integer("reviews_count").notNull().default(0),
    isOnline: boolean("is_online").notNull().default(true),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("users_username_idx").on(t.username)]
);

export const games = pgTable(
  "games",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 120 }).notNull().unique(),
    icon: text("icon").notNull(),
    categories: jsonb("categories")
      .$type<GameCategory[]>()
      .notNull()
      .default(["Аккаунты", "Валюта", "Услуги", "Предметы"]),
  },
  (t) => [index("games_slug_idx").on(t.slug)]
);

export const lots = pgTable(
  "lots",
  {
    id: serial("id").primaryKey(),
    sellerId: integer("seller_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    gameId: integer("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    category: varchar("category", { length: 64 }).notNull(),
    serverName: varchar("server_name", { length: 100 }).notNull().default("Все серверы"),
    title: varchar("title", { length: 220 }).notNull(),
    description: text("description").notNull(),
    price: numeric("price", { precision: 12, scale: 2 }).notNull(),
    stockCount: integer("stock_count").notNull().default(1),
    isActive: boolean("is_active").notNull().default(true),
    autoDeliveryText: text("auto_delivery_text"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("lots_game_category_idx").on(t.gameId, t.category),
    index("lots_seller_idx").on(t.sellerId),
  ]
);

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    buyerId: integer("buyer_id")
      .notNull()
      .references(() => users.id),
    sellerId: integer("seller_id")
      .notNull()
      .references(() => users.id),
    lotId: integer("lot_id")
      .notNull()
      .references(() => lots.id),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    status: varchar("status", { length: 32 })
      .$type<OrderStatus>()
      .notNull()
      .default("paid"),
    deliveredData: text("delivered_data"),
    disputeReason: text("dispute_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    index("orders_buyer_idx").on(t.buyerId),
    index("orders_seller_idx").on(t.sellerId),
  ]
);

export const messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    senderId: integer("sender_id")
      .notNull()
      .references(() => users.id),
    receiverId: integer("receiver_id")
      .notNull()
      .references(() => users.id),
    orderId: integer("order_id").references(() => orders.id, {
      onDelete: "set null",
    }),
    isSystem: boolean("is_system").notNull().default(false),
    text: text("text").notNull(),
    timestamp: timestamp("timestamp", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("messages_pair_idx").on(t.senderId, t.receiverId),
    index("messages_order_idx").on(t.orderId),
  ]
);

export const reviews = pgTable(
  "reviews",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .unique()
      .references(() => orders.id, { onDelete: "cascade" }),
    authorId: integer("author_id")
      .notNull()
      .references(() => users.id),
    targetUserId: integer("target_user_id")
      .notNull()
      .references(() => users.id),
    rating: integer("rating").notNull(),
    text: text("text").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("reviews_target_idx").on(t.targetUserId)]
);

export const walletTransactions = pgTable(
  "wallet_transactions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 32 }).notNull(), // topup | escrow_hold | sale_release | refund | withdraw
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    description: varchar("description", { length: 255 }).notNull(),
    orderId: integer("order_id").references(() => orders.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("wallet_tx_user_idx").on(t.userId)]
);

export const usersRelations = relations(users, ({ many }) => ({
  lots: many(lots),
  reviewsReceived: many(reviews, { relationName: "targetReviews" }),
  reviewsAuthored: many(reviews, { relationName: "authoredReviews" }),
}));

export const gamesRelations = relations(games, ({ many }) => ({
  lots: many(lots),
}));

export const lotsRelations = relations(lots, ({ one }) => ({
  seller: one(users, {
    fields: [lots.sellerId],
    references: [users.id],
  }),
  game: one(games, {
    fields: [lots.gameId],
    references: [games.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  buyer: one(users, {
    fields: [orders.buyerId],
    references: [users.id],
  }),
  seller: one(users, {
    fields: [orders.sellerId],
    references: [users.id],
  }),
  lot: one(lots, {
    fields: [orders.lotId],
    references: [lots.id],
  }),
  messages: many(messages),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  order: one(orders, {
    fields: [reviews.orderId],
    references: [orders.id],
  }),
  author: one(users, {
    fields: [reviews.authorId],
    references: [users.id],
    relationName: "authoredReviews",
  }),
  targetUser: one(users, {
    fields: [reviews.targetUserId],
    references: [users.id],
    relationName: "targetReviews",
  }),
}));

export type UserRow = typeof users.$inferSelect;
export type GameRow = typeof games.$inferSelect;
export type LotRow = typeof lots.$inferSelect;
export type OrderRow = typeof orders.$inferSelect;
export type MessageRow = typeof messages.$inferSelect;
export type ReviewRow = typeof reviews.$inferSelect;
