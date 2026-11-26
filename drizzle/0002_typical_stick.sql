CREATE TYPE "public"."credential_type" AS ENUM('senha', 'api_key', 'token', 'ssh', 'env', 'outro');--> statement-breakpoint
CREATE TYPE "public"."financial_entry_type" AS ENUM('pontual', 'recorrente');--> statement-breakpoint
CREATE TYPE "public"."financial_status" AS ENUM('previsto', 'pendente', 'pago', 'atrasado', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."meeting_type" AS ENUM('interna', 'cliente');--> statement-breakpoint
ALTER TYPE "public"."activity_entity" ADD VALUE 'financial' BEFORE 'user';--> statement-breakpoint
ALTER TYPE "public"."activity_entity" ADD VALUE 'meeting' BEFORE 'user';--> statement-breakpoint
ALTER TYPE "public"."activity_entity" ADD VALUE 'secret' BEFORE 'user';--> statement-breakpoint
CREATE TABLE "financial_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"project_id" uuid,
	"recurring_payment_id" uuid,
	"description" text NOT NULL,
	"entry_type" "financial_entry_type" DEFAULT 'pontual' NOT NULL,
	"reference_month" text,
	"amount" numeric(12, 2) NOT NULL,
	"due_date" date NOT NULL,
	"paid_at" date,
	"status" "financial_status" DEFAULT 'pendente' NOT NULL,
	"payment_method" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meetings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"meeting_date" timestamp with time zone NOT NULL,
	"meeting_type" "meeting_type" DEFAULT 'cliente' NOT NULL,
	"client_id" uuid,
	"project_id" uuid,
	"participants" text,
	"topics_discussed" text,
	"decisions" text,
	"next_actions" text,
	"responsibles" text,
	"due_date" date,
	"notes" text,
	"created_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recurring_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"total_sold_value" numeric(12, 2),
	"setup_value" numeric(12, 2),
	"monthly_fee" numeric(12, 2),
	"billing_start_date" date,
	"due_day" integer DEFAULT 10 NOT NULL,
	"payment_method" text,
	"installments_count" integer DEFAULT 1 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "secrets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"service" text NOT NULL,
	"project_id" uuid,
	"url" text,
	"login" text,
	"encrypted_secret" text NOT NULL,
	"credential_type" "credential_type" DEFAULT 'senha' NOT NULL,
	"notes" text,
	"updated_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weekly_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"week_start" date NOT NULL,
	"owner_id" uuid,
	"project_id" uuid,
	"completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_recurring_payment_id_recurring_payments_id_fk" FOREIGN KEY ("recurring_payment_id") REFERENCES "public"."recurring_payments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_payments" ADD CONSTRAINT "recurring_payments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_payments" ADD CONSTRAINT "recurring_payments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "secrets" ADD CONSTRAINT "secrets_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "secrets" ADD CONSTRAINT "secrets_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_goals" ADD CONSTRAINT "weekly_goals_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_goals" ADD CONSTRAINT "weekly_goals_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "financial_entries_client_id_idx" ON "financial_entries" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "financial_entries_project_id_idx" ON "financial_entries" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "financial_entries_status_idx" ON "financial_entries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "financial_entries_due_date_idx" ON "financial_entries" USING btree ("due_date");--> statement-breakpoint
CREATE UNIQUE INDEX "financial_entries_recurring_month_uidx" ON "financial_entries" USING btree ("recurring_payment_id","reference_month");--> statement-breakpoint
CREATE INDEX "meetings_client_id_idx" ON "meetings" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "meetings_project_id_idx" ON "meetings" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "meetings_date_idx" ON "meetings" USING btree ("meeting_date");--> statement-breakpoint
CREATE UNIQUE INDEX "recurring_payments_project_id_uidx" ON "recurring_payments" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "recurring_payments_client_id_idx" ON "recurring_payments" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "secrets_project_id_idx" ON "secrets" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "secrets_service_idx" ON "secrets" USING btree ("service");--> statement-breakpoint
CREATE INDEX "weekly_goals_week_start_idx" ON "weekly_goals" USING btree ("week_start");