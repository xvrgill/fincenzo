CREATE TABLE "recurring_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope_type" text NOT NULL,
	"scope_id" uuid NOT NULL,
	"merchant_key" text NOT NULL,
	"merchant_name" text NOT NULL,
	"category" text,
	"average_amount_cents" bigint NOT NULL,
	"iso_currency_code" text DEFAULT 'USD',
	"cadence" text NOT NULL,
	"first_seen_date" date NOT NULL,
	"last_seen_date" date NOT NULL,
	"next_expected_date" date NOT NULL,
	"sample_count" integer NOT NULL,
	"status" text DEFAULT 'suggested' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "recurring_scope_merchant_cadence_idx" ON "recurring_transactions" USING btree ("scope_type","scope_id","merchant_key","cadence");