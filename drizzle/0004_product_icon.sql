ALTER TABLE "products" ADD COLUMN "icon" text;--> statement-breakpoint
UPDATE "products" SET "icon" = CASE "code" WHEN 'FO' THEN 'fiber' WHEN 'RD' THEN 'radio' WHEN 'IP' THEN 'tv' WHEN 'DT' THEN 'broadcast' ELSE 'box' END WHERE "icon" IS NULL;
