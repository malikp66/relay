ALTER TABLE "report_templates" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "report_templates" ADD COLUMN "updated_by" text;--> statement-breakpoint
ALTER TABLE "report_templates" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "template_fields" jsonb;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "template_version" integer;--> statement-breakpoint
ALTER TABLE "report_templates" ADD CONSTRAINT "report_templates_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
UPDATE "reports" r SET "template_fields" = t."fields", "template_version" = t."version" FROM "report_templates" t WHERE r."template_id" = t."id" AND r."template_fields" IS NULL;
