CREATE UNIQUE INDEX IF NOT EXISTS "sms_messages_org_provider_external_uidx"
ON "sms_messages" USING btree ("org_id", "provider", "external_message_id")
WHERE "external_message_id" IS NOT NULL;
