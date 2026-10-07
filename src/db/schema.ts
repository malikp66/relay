import {
  customType,
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  doublePrecision,
  jsonb,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
const ts = (name: string) => timestamp(name, { withTimezone: true });

export type Role = "admin" | "supervisor" | "technician";
export type TaskStatus =
  | "assigned"
  | "in_progress"
  | "job_done"
  | "submitted"
  | "under_review"
  | "revision"
  | "approved"
  | "finished"
  | "cancelled";
export type ChecklistType = "tick" | "data" | "photo";

export type ReportField = {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "select" | "boolean";
  required: boolean;
  options?: string[];
  placeholder?: string;
};

/* ───────────── Identitas & organisasi ───────────── */

export const users = pgTable("users", {
  id: id(),
  name: text("name").notNull(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").$type<Role>().notNull(),
  phone: text("phone"),
  title: text("title"),
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: ts("last_login_at"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: ts("expires_at").notNull(),
  createdAt: createdAt(),
});

export const groups = pgTable("groups", {
  id: id(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  description: text("description"),
  parentId: text("parent_id"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const groupMembers = pgTable(
  "group_members",
  {
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    memberRole: text("member_role").$type<"supervisor" | "technician">().notNull(),
  },
  (t) => [primaryKey({ columns: [t.groupId, t.userId] })],
);

/* ───────────── Master data ───────────── */

export const categories = pgTable("categories", {
  id: id(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  isScheduled: boolean("is_scheduled").notNull().default(false),
  description: text("description"),
  createdAt: createdAt(),
});

export const groupScopes = pgTable(
  "group_scopes",
  {
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.groupId, t.categoryId] })],
);

export const products = pgTable("products", {
  id: id(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  createdAt: createdAt(),
});

export const priorities = pgTable("priorities", {
  id: id(),
  name: text("name").notNull(),
  level: integer("level").notNull(),
  slaHours: integer("sla_hours").notNull(),
  createdAt: createdAt(),
});

export const customers = pgTable("customers", {
  id: id(),
  name: text("name").notNull(),
  customerNo: text("customer_no").notNull().unique(),
  phone: text("phone"),
  address: text("address"),
  service: text("service"),
  createdAt: createdAt(),
});

export const sites = pgTable("sites", {
  id: id(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  radiusM: integer("radius_m").notNull().default(200),
  customerId: text("customer_id").references(() => customers.id),
  createdAt: createdAt(),
});

/* ───────────── Template ───────────── */

export const checklistTemplates = pgTable("checklist_templates", {
  id: id(),
  name: text("name").notNull(),
  categoryId: text("category_id")
    .notNull()
    .references(() => categories.id),
  productId: text("product_id")
    .notNull()
    .references(() => products.id),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const checklistTemplateItems = pgTable("checklist_template_items", {
  id: id(),
  templateId: text("template_id")
    .notNull()
    .references(() => checklistTemplates.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  type: text("type").$type<ChecklistType>().notNull(),
  unit: text("unit"),
  required: boolean("required").notNull().default(true),
  sort: integer("sort").notNull().default(0),
});

export const reportTemplates = pgTable("report_templates", {
  id: id(),
  categoryId: text("category_id")
    .notNull()
    .references(() => categories.id),
  name: text("name").notNull(),
  fields: jsonb("fields").$type<ReportField[]>().notNull(),
  createdAt: createdAt(),
});

/* ───────────── Task ───────────── */

export const tasks = pgTable(
  "tasks",
  {
    id: id(),
    code: text("code").notNull().unique(),
    title: text("title").notNull(),
    description: text("description"),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id),
    priorityId: text("priority_id")
      .notNull()
      .references(() => priorities.id),
    siteId: text("site_id").references(() => sites.id),
    customerId: text("customer_id").references(() => customers.id),
    status: text("status").$type<TaskStatus>().notNull().default("assigned"),
    source: text("source").$type<"manual" | "complaint" | "maintenance_plan">().notNull().default("manual"),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    dueAt: ts("due_at").notNull(),
    scheduledFor: ts("scheduled_for"),
    startedAt: ts("started_at"),
    jobDoneAt: ts("job_done_at"),
    submittedAt: ts("submitted_at"),
    lastSubmittedAt: ts("last_submitted_at"),
    approvedAt: ts("approved_at"),
    finishedAt: ts("finished_at"),
    cancelledAt: ts("cancelled_at"),
    cancelReason: text("cancel_reason"),
    revisionCount: integer("revision_count").notNull().default(0),
    version: integer("version").notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("tasks_status_group_idx").on(t.status, t.groupId),
    index("tasks_due_idx").on(t.dueAt),
    index("tasks_scheduled_idx").on(t.scheduledFor),
  ],
);

export const taskAssignees = pgTable(
  "task_assignees",
  {
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    assignedAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.taskId, t.userId] }), index("task_assignees_user_idx").on(t.userId)],
);

export const checklistItems = pgTable("checklist_items", {
  id: id(),
  taskId: text("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  type: text("type").$type<ChecklistType>().notNull(),
  unit: text("unit"),
  required: boolean("required").notNull().default(true),
  sort: integer("sort").notNull().default(0),
});

export const checklistResponses = pgTable(
  "checklist_responses",
  {
    id: id(),
    itemId: text("item_id")
      .notNull()
      .references(() => checklistItems.id, { onDelete: "cascade" }),
    checked: boolean("checked"),
    value: text("value"),
    photos: jsonb("photos").$type<string[]>().notNull().default([]),
    completedBy: text("completed_by").references(() => users.id),
    completedAt: ts("completed_at"),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("checklist_responses_item_uq").on(t.itemId)],
);

export const reports = pgTable("reports", {
  id: id(),
  taskId: text("task_id")
    .notNull()
    .unique()
    .references(() => tasks.id, { onDelete: "cascade" }),
  templateId: text("template_id").references(() => reportTemplates.id),
  fields: jsonb("fields").$type<Record<string, string | number | boolean | null>>().notNull().default({}),
  findings: text("findings"),
  submittedBy: text("submitted_by").references(() => users.id),
  submittedAt: ts("submitted_at"),
  lastEditedBy: text("last_edited_by").references(() => users.id),
  version: integer("version").notNull().default(1),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const reviews = pgTable("reviews", {
  id: id(),
  taskId: text("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  passNo: integer("pass_no").notNull(),
  reviewerId: text("reviewer_id")
    .notNull()
    .references(() => users.id),
  decision: text("decision").$type<"approve" | "revision">().notNull(),
  comments: text("comments"),
  reviewedAt: ts("reviewed_at").notNull().defaultNow(),
});

export const attendances = pgTable(
  "attendances",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    checkInAt: ts("check_in_at").notNull(),
    checkInLat: doublePrecision("check_in_lat"),
    checkInLng: doublePrecision("check_in_lng"),
    accuracyM: doublePrecision("accuracy_m"),
    distanceM: doublePrecision("distance_m"),
    withinGeofence: boolean("within_geofence"),
    isLate: boolean("is_late").notNull().default(false),
    checkOutAt: ts("check_out_at"),
    autoClosed: boolean("auto_closed").notNull().default(false),
  },
  (t) => [index("attendances_user_idx").on(t.userId, t.checkInAt)],
);

export const taskEvents = pgTable(
  "task_events",
  {
    id: id(),
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    actorId: text("actor_id").references(() => users.id),
    type: text("type").notNull(),
    fromStatus: text("from_status").$type<TaskStatus>(),
    toStatus: text("to_status").$type<TaskStatus>(),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [index("task_events_task_idx").on(t.taskId, t.createdAt)],
);

export const maintenancePlans = pgTable("maintenance_plans", {
  id: id(),
  title: text("title").notNull(),
  groupId: text("group_id")
    .notNull()
    .references(() => groups.id),
  productId: text("product_id")
    .notNull()
    .references(() => products.id),
  siteId: text("site_id")
    .notNull()
    .references(() => sites.id),
  priorityId: text("priority_id")
    .notNull()
    .references(() => priorities.id),
  frequency: text("frequency").$type<"weekly" | "monthly">().notNull(),
  nextDate: ts("next_date").notNull(),
  assigneeIds: jsonb("assignee_ids").$type<string[]>().notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: text("created_by").references(() => users.id),
  createdAt: createdAt(),
});

export const auditLogs = pgTable("audit_logs", {
  id: id(),
  actorId: text("actor_id").references(() => users.id),
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  action: text("action").notNull(),
  summary: text("summary"),
  createdAt: createdAt(),
});

/* ───────────── File (foto bukti) ───────────── */

const bytea = customType<{ data: Buffer; driverData: Buffer | Uint8Array }>({
  dataType: () => "bytea",
  fromDriver: (v) => (Buffer.isBuffer(v) ? v : Buffer.from(v)),
});

/** Foto disimpan di database agar jalan di serverless (Vercel) tanpa disk persisten. */
export const files = pgTable("files", {
  id: text("id").primaryKey(),
  mime: text("mime").notNull(),
  size: integer("size").notNull(),
  data: bytea("data").notNull(),
  uploadedBy: text("uploaded_by").references(() => users.id),
  createdAt: createdAt(),
});

/* ───────────── Notifikasi ───────────── */

export type NotificationKind =
  | "task_assigned"
  | "task_started"
  | "job_done"
  | "report_submitted"
  | "report_resubmitted"
  | "review_started"
  | "revision_requested"
  | "task_approved"
  | "task_cancelled"
  | "due_soon"
  | "overdue"
  | "test";

export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").$type<NotificationKind>().notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    url: text("url"),
    taskId: text("task_id").references(() => tasks.id, { onDelete: "cascade" }),
    actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
    readAt: ts("read_at"),
    createdAt: createdAt(),
  },
  (t) => [index("notifications_user_created_idx").on(t.userId, t.createdAt)],
);

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userAgent: text("user_agent"),
  createdAt: createdAt(),
});
