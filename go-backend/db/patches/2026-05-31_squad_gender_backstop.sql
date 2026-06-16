-- Patch: DB-level single-gender invariant for squads (fail-safe backstop).
--
-- The application layer (squad/transaction services) already rejects mixed-gender
-- squads and gender-mismatched property locks. This adds a database backstop so the
-- invariant holds even if a future code path forgets a check.
--
-- A squads.gender column records the squad's gender; a trigger on squad_members sets
-- it from the first accepted member (the creator) and rejects any later accepted
-- member whose gender differs. Existing squads are backfilled from their creator.
-- Safe to re-run.

ALTER TABLE squads ADD COLUMN IF NOT EXISTS gender gender_type;

-- Backfill existing squads from their creator's gender.
UPDATE squads s
SET    gender = u.gender
FROM   users u
WHERE  u.id = s.created_by
  AND  s.gender IS NULL;

CREATE OR REPLACE FUNCTION enforce_squad_single_gender() RETURNS TRIGGER AS $$
DECLARE
    v_member_gender gender_type;
    v_squad_gender  gender_type;
BEGIN
    IF NEW.status <> 'accepted' THEN
        RETURN NEW;
    END IF;

    SELECT gender INTO v_member_gender FROM users  WHERE id = NEW.user_id;
    SELECT gender INTO v_squad_gender  FROM squads WHERE id = NEW.squad_id;

    IF v_squad_gender IS NULL THEN
        IF v_member_gender IS NOT NULL THEN
            UPDATE squads SET gender = v_member_gender WHERE id = NEW.squad_id;
        END IF;
        RETURN NEW;
    END IF;

    IF v_member_gender IS DISTINCT FROM v_squad_gender THEN
        RAISE EXCEPTION 'squad gender mismatch: user % (%) cannot join squad % (gender %)',
            NEW.user_id, COALESCE(v_member_gender::text, 'undisclosed'), NEW.squad_id, v_squad_gender;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_squad_single_gender_trg ON squad_members;
CREATE TRIGGER enforce_squad_single_gender_trg
    BEFORE INSERT OR UPDATE ON squad_members
    FOR EACH ROW EXECUTE FUNCTION enforce_squad_single_gender();
