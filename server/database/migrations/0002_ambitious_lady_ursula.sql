ALTER TABLE "ai_conversation" ADD COLUMN "title" varchar(200);--> statement-breakpoint
ALTER TABLE "ai_conversation" ADD COLUMN "context_type" varchar(50);--> statement-breakpoint
ALTER TABLE "ai_conversation" ADD COLUMN "context_id" varchar(26);--> statement-breakpoint
CREATE INDEX "ai_conversation_context_idx" ON "ai_conversation" USING btree ("context_type","context_id");