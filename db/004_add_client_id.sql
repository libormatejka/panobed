-- Přidá client_id do chat_log pro sledování unikátních uživatelů (z GA cookie _ga)
ALTER TABLE chat_log ADD COLUMN client_id TEXT;
