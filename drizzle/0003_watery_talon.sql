CREATE TABLE "waitlist_signups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"source" text,
	"referrer" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"invited_at" timestamp with time zone,
	"invited_token_hash" text,
	"invited_token_expires_at" timestamp with time zone,
	"signed_up_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX "waitlist_signups_email_unique" ON "waitlist_signups" USING btree ("email");