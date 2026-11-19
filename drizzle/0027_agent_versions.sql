CREATE TABLE "agent_profile_version" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"numero" integer NOT NULL,
	"origen" text NOT NULL,
	"nota" text,
	"snapshot" jsonb NOT NULL,
	"huella" text NOT NULL,
	"author_user_id" text,
	"lab_score" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_profile_version" ADD CONSTRAINT "agent_profile_version_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_profile_version" ADD CONSTRAINT "agent_profile_version_author_user_id_user_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_version_org_num_uq" ON "agent_profile_version" USING btree ("organization_id","numero");--> statement-breakpoint
CREATE INDEX "agent_version_org_idx" ON "agent_profile_version" USING btree ("organization_id","created_at");