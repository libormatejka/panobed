-- Přidá čas generování odpovědi do chat_log
ALTER TABLE chat_log ADD COLUMN response_time_ms INTEGER;
