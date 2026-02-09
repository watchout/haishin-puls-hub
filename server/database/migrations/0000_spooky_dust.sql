CREATE TABLE "ai_conversation" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(26) NOT NULL,
	"user_id" varchar(26) NOT NULL,
	"event_id" varchar(26),
	"messages" jsonb NOT NULL,
	"usecase" varchar(100),
	"model_provider" varchar(50) NOT NULL,
	"model_name" varchar(100) NOT NULL,
	"total_input_tokens" integer DEFAULT 0 NOT NULL,
	"total_output_tokens" integer DEFAULT 0 NOT NULL,
	"estimated_cost_jpy" numeric(10, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checkin" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"participant_id" varchar(26) NOT NULL,
	"event_id" varchar(26) NOT NULL,
	"tenant_id" varchar(26) NOT NULL,
	"checked_in_at" timestamp with time zone DEFAULT now() NOT NULL,
	"method" varchar(50) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "estimate" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"event_id" varchar(26),
	"tenant_id" varchar(26) NOT NULL,
	"title" varchar(500) NOT NULL,
	"items" jsonb NOT NULL,
	"total_amount" integer NOT NULL,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"created_by" varchar(26) NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(26) NOT NULL,
	"venue_id" varchar(26),
	"title" varchar(500) NOT NULL,
	"description" text,
	"event_type" varchar(50) NOT NULL,
	"format" varchar(50) NOT NULL,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"capacity_onsite" integer,
	"capacity_online" integer,
	"budget_min" integer,
	"budget_max" integer,
	"streaming_url" text,
	"portal_slug" varchar(100),
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ai_generated" jsonb,
	"created_by" varchar(26) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_member" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"event_id" varchar(26) NOT NULL,
	"user_id" varchar(26) NOT NULL,
	"role" varchar(50) NOT NULL,
	"tenant_id" varchar(26) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_report" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"event_id" varchar(26) NOT NULL,
	"tenant_id" varchar(26) NOT NULL,
	"report_type" varchar(50) NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb,
	"generated_by" varchar(50) NOT NULL,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file_upload" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(26) NOT NULL,
	"uploaded_by" varchar(26) NOT NULL,
	"event_id" varchar(26),
	"entity_type" varchar(50) NOT NULL,
	"entity_id" varchar(26) NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_type" varchar(100) NOT NULL,
	"file_size" integer NOT NULL,
	"storage_path" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"ip_address" varchar(45) NOT NULL,
	"user_agent" varchar(500),
	"success" boolean NOT NULL,
	"failure_reason" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(26) NOT NULL,
	"user_id" varchar(26) NOT NULL,
	"event_id" varchar(26),
	"type" varchar(50) NOT NULL,
	"title" varchar(500) NOT NULL,
	"body" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"sent_via" varchar(50) NOT NULL,
	"email_sent_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "participant" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"event_id" varchar(26) NOT NULL,
	"tenant_id" varchar(26) NOT NULL,
	"user_id" varchar(26),
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"organization" varchar(255),
	"participation_type" varchar(50) NOT NULL,
	"registration_status" varchar(50) DEFAULT 'registered' NOT NULL,
	"qr_code" varchar(255),
	"custom_fields" jsonb,
	"registered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prompt_template" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(26),
	"usecase" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"system_prompt" text NOT NULL,
	"user_prompt_template" text NOT NULL,
	"variables" jsonb,
	"model_config" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "speaker" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"event_id" varchar(26) NOT NULL,
	"tenant_id" varchar(26) NOT NULL,
	"user_id" varchar(26),
	"name" varchar(255) NOT NULL,
	"title" varchar(255),
	"organization" varchar(255),
	"bio" text,
	"photo_url" text,
	"presentation_title" varchar(500),
	"start_at" timestamp with time zone,
	"duration_minutes" integer,
	"format" varchar(50),
	"materials_url" text,
	"submission_status" varchar(50) DEFAULT 'pending' NOT NULL,
	"ai_generated_bio" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "streaming_package" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(26),
	"name" varchar(255) NOT NULL,
	"description" text,
	"items" jsonb NOT NULL,
	"base_price" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "survey" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"event_id" varchar(26) NOT NULL,
	"tenant_id" varchar(26) NOT NULL,
	"title" varchar(500) NOT NULL,
	"questions" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "survey_response" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"survey_id" varchar(26) NOT NULL,
	"participant_id" varchar(26),
	"event_id" varchar(26) NOT NULL,
	"tenant_id" varchar(26) NOT NULL,
	"answers" jsonb NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"event_id" varchar(26) NOT NULL,
	"tenant_id" varchar(26) NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"assigned_role" varchar(50),
	"assigned_user_id" varchar(26),
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"priority" varchar(20) DEFAULT 'medium' NOT NULL,
	"relative_day" integer,
	"due_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"template_id" varchar(26),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_template" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(26),
	"event_type" varchar(50) NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"assigned_role" varchar(50) NOT NULL,
	"relative_day" integer NOT NULL,
	"priority" varchar(20) DEFAULT 'medium' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"logo_url" text,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"plan" varchar(50) DEFAULT 'pilot' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"avatar_url" text,
	"email_verified" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_tenant" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"user_id" varchar(26) NOT NULL,
	"tenant_id" varchar(26) NOT NULL,
	"role" varchar(50) NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "venue" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(26) NOT NULL,
	"name" varchar(255) NOT NULL,
	"branch_name" varchar(255) NOT NULL,
	"address" text NOT NULL,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"capacity" integer NOT NULL,
	"floor_map_url" text,
	"equipment" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"wifi_info" jsonb,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_conversation" ADD CONSTRAINT "ai_conversation_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_conversation" ADD CONSTRAINT "ai_conversation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_conversation" ADD CONSTRAINT "ai_conversation_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkin" ADD CONSTRAINT "checkin_participant_id_participant_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkin" ADD CONSTRAINT "checkin_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkin" ADD CONSTRAINT "checkin_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estimate" ADD CONSTRAINT "estimate_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estimate" ADD CONSTRAINT "estimate_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estimate" ADD CONSTRAINT "estimate_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_venue_id_venue_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venue"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_member" ADD CONSTRAINT "event_member_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_member" ADD CONSTRAINT "event_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_member" ADD CONSTRAINT "event_member_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_report" ADD CONSTRAINT "event_report_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_report" ADD CONSTRAINT "event_report_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_upload" ADD CONSTRAINT "file_upload_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_upload" ADD CONSTRAINT "file_upload_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_upload" ADD CONSTRAINT "file_upload_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant" ADD CONSTRAINT "participant_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant" ADD CONSTRAINT "participant_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant" ADD CONSTRAINT "participant_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_template" ADD CONSTRAINT "prompt_template_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "speaker" ADD CONSTRAINT "speaker_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "speaker" ADD CONSTRAINT "speaker_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "speaker" ADD CONSTRAINT "speaker_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streaming_package" ADD CONSTRAINT "streaming_package_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey" ADD CONSTRAINT "survey_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey" ADD CONSTRAINT "survey_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_response" ADD CONSTRAINT "survey_response_survey_id_survey_id_fk" FOREIGN KEY ("survey_id") REFERENCES "public"."survey"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_response" ADD CONSTRAINT "survey_response_participant_id_participant_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_response" ADD CONSTRAINT "survey_response_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_response" ADD CONSTRAINT "survey_response_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_assigned_user_id_user_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_template" ADD CONSTRAINT "task_template_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tenant" ADD CONSTRAINT "user_tenant_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tenant" ADD CONSTRAINT "user_tenant_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue" ADD CONSTRAINT "venue_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_conversation_tenant_user_idx" ON "ai_conversation" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE INDEX "ai_conversation_event_idx" ON "ai_conversation" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "ai_conversation_created_idx" ON "ai_conversation" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "checkin_event_idx" ON "checkin" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "checkin_participant_idx" ON "checkin" USING btree ("participant_id");--> statement-breakpoint
CREATE INDEX "estimate_event_idx" ON "estimate" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "estimate_tenant_idx" ON "estimate" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "event_tenant_idx" ON "event" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "event_tenant_status_idx" ON "event" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "event_tenant_start_idx" ON "event" USING btree ("tenant_id","start_at");--> statement-breakpoint
CREATE UNIQUE INDEX "event_portal_slug_idx" ON "event" USING btree ("portal_slug");--> statement-breakpoint
CREATE UNIQUE INDEX "event_member_unique_idx" ON "event_member" USING btree ("event_id","user_id");--> statement-breakpoint
CREATE INDEX "event_member_tenant_idx" ON "event_member" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "event_report_event_idx" ON "event_report" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_report_tenant_idx" ON "event_report" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "file_upload_tenant_idx" ON "file_upload" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "file_upload_entity_idx" ON "file_upload" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "login_attempts_email_created_idx" ON "login_attempts" USING btree ("email","created_at");--> statement-breakpoint
CREATE INDEX "login_attempts_ip_created_idx" ON "login_attempts" USING btree ("ip_address","created_at");--> statement-breakpoint
CREATE INDEX "notification_user_read_idx" ON "notification" USING btree ("user_id","is_read");--> statement-breakpoint
CREATE INDEX "notification_tenant_idx" ON "notification" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "notification_event_idx" ON "notification" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "participant_event_idx" ON "participant" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "participant_tenant_idx" ON "participant" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "participant_qr_code_idx" ON "participant" USING btree ("qr_code");--> statement-breakpoint
CREATE INDEX "participant_event_email_idx" ON "participant" USING btree ("event_id","email");--> statement-breakpoint
CREATE INDEX "prompt_template_usecase_active_idx" ON "prompt_template" USING btree ("usecase","is_active");--> statement-breakpoint
CREATE INDEX "prompt_template_tenant_idx" ON "prompt_template" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "speaker_event_idx" ON "speaker" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "speaker_tenant_idx" ON "speaker" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "streaming_package_tenant_idx" ON "streaming_package" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "survey_event_idx" ON "survey" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "survey_tenant_idx" ON "survey" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "survey_response_survey_idx" ON "survey_response" USING btree ("survey_id");--> statement-breakpoint
CREATE INDEX "survey_response_event_idx" ON "survey_response" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "task_event_idx" ON "task" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "task_tenant_idx" ON "task" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "task_assigned_user_idx" ON "task" USING btree ("assigned_user_id");--> statement-breakpoint
CREATE INDEX "task_event_status_idx" ON "task" USING btree ("event_id","status");--> statement-breakpoint
CREATE INDEX "task_event_due_idx" ON "task" USING btree ("event_id","due_at");--> statement-breakpoint
CREATE INDEX "task_template_event_type_idx" ON "task_template" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "task_template_tenant_type_idx" ON "task_template" USING btree ("tenant_id","event_type");--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_slug_idx" ON "tenant" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_idx" ON "user" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "user_tenant_unique_idx" ON "user_tenant" USING btree ("user_id","tenant_id");--> statement-breakpoint
CREATE INDEX "user_tenant_user_idx" ON "user_tenant" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_tenant_tenant_idx" ON "user_tenant" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "venue_tenant_idx" ON "venue" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "venue_tenant_branch_idx" ON "venue" USING btree ("tenant_id","branch_name");