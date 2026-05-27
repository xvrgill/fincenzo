ALTER TABLE "transactions" ADD COLUMN "payment_channel" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "merchant_logo_url" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "merchant_website" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "original_description" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "location_address" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "location_city" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "location_region" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "location_postal_code" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "location_country" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "location_lat" numeric(9, 6);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "location_lon" numeric(9, 6);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "location_store_number" text;