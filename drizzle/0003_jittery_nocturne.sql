CREATE TYPE "public"."contract_doc_status" AS ENUM('rascunho', 'enviado', 'assinado', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."contract_ip_mode" AS ENUM('cessao_apos_quitacao', 'licenca_mensal');--> statement-breakpoint
CREATE TYPE "public"."contract_template_type" AS ENUM('desenvolvimento', 'manutencao', 'desenvolvimento_manutencao');--> statement-breakpoint
ALTER TYPE "public"."activity_entity" ADD VALUE 'contract' BEFORE 'user';--> statement-breakpoint
CREATE TABLE "company_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legal_name" text DEFAULT 'ValeMind' NOT NULL,
	"trade_name" text DEFAULT 'ValeMind' NOT NULL,
	"cnpj" text,
	"address" text,
	"city" text,
	"state" text,
	"representative_name" text,
	"representative_cpf" text,
	"email" text,
	"phone" text,
	"pix_key" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contract_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_number" text NOT NULL,
	"title" text NOT NULL,
	"template_type" "contract_template_type" DEFAULT 'desenvolvimento_manutencao' NOT NULL,
	"client_id" uuid NOT NULL,
	"project_id" uuid,
	"status" "contract_doc_status" DEFAULT 'rascunho' NOT NULL,
	"total_value" numeric(12, 2),
	"setup_value" numeric(12, 2),
	"monthly_fee" numeric(12, 2),
	"due_day" integer DEFAULT 10 NOT NULL,
	"payment_method" text,
	"start_date" date,
	"due_date" date,
	"ip_mode" "contract_ip_mode" DEFAULT 'cessao_apos_quitacao' NOT NULL,
	"content" text NOT NULL,
	"signed_url" text,
	"signed_at" timestamp with time zone,
	"created_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contract_documents_contract_number_unique" UNIQUE("contract_number")
);
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "legal_name" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "document" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "representative_name" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "representative_cpf" text;--> statement-breakpoint
ALTER TABLE "contract_documents" ADD CONSTRAINT "contract_documents_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_documents" ADD CONSTRAINT "contract_documents_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_documents" ADD CONSTRAINT "contract_documents_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contract_documents_client_id_idx" ON "contract_documents" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "contract_documents_project_id_idx" ON "contract_documents" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "contract_documents_status_idx" ON "contract_documents" USING btree ("status");