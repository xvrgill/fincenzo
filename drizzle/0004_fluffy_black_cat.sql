CREATE TABLE "holdings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"security_id" uuid NOT NULL,
	"quantity" numeric(28, 10) NOT NULL,
	"institution_value_cents" bigint NOT NULL,
	"cost_basis_cents" bigint,
	"iso_currency_code" text DEFAULT 'USD',
	"as_of" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "securities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plaid_security_id" text NOT NULL,
	"ticker_symbol" text,
	"name" text,
	"type" text,
	"close_price_cents" bigint,
	"close_price_as_of" date,
	"iso_currency_code" text DEFAULT 'USD',
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "securities_plaid_security_id_unique" UNIQUE("plaid_security_id")
);
--> statement-breakpoint
ALTER TABLE "holdings" ADD CONSTRAINT "holdings_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holdings" ADD CONSTRAINT "holdings_security_id_securities_id_fk" FOREIGN KEY ("security_id") REFERENCES "public"."securities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "holdings_account_security_idx" ON "holdings" USING btree ("account_id","security_id");