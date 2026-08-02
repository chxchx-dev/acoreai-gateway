-- Generaliza la plataforma por defecto para instalaciones reutilizables.
UPDATE "AutomationProcess"
SET "platform" = 'acoreai'
WHERE "platform" = 'olan';

ALTER TABLE "AutomationProcess"
ALTER COLUMN "platform" SET DEFAULT 'acoreai';
