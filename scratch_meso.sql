-- Mock MCP Mesocycle generation
DO $$
DECLARE
    v_user_id UUID := '6515f096-5e83-4593-87a5-3dc8553bd751';
    v_routine_id UUID := '348a816d-7d5f-4c80-ad3a-fd2f6f93de01';
    v_meso_id UUID := gen_random_uuid();
    v_week1_id UUID := gen_random_uuid();
    v_week2_id UUID := gen_random_uuid();
    v_session1_id UUID := gen_random_uuid();
    v_session2_id UUID := gen_random_uuid();
BEGIN
    -- 1. Insert Mesocycle
    INSERT INTO mesocycles (id, user_id, name, duration_weeks, current_week, status)
    VALUES (v_meso_id, v_user_id, 'Mesociclo de Hipertrofia (AI Generado)', 2, 1, 'active');

    -- 2. Insert Weeks
    INSERT INTO mesocycle_weeks (id, mesocycle_id, user_id, week_number, is_deload, focus_notes)
    VALUES 
        (v_week1_id, v_meso_id, v_user_id, 1, false, 'Semana de introducción. Mantener RIR 2.'),
        (v_week2_id, v_meso_id, v_user_id, 2, false, 'Sobrecarga. Subir pesos, RIR 1.');

    -- 3. Insert Sessions
    INSERT INTO mesocycle_sessions (id, week_id, user_id, day_number, routine_id, status)
    VALUES 
        (v_session1_id, v_week1_id, v_user_id, 1, v_routine_id, 'pending'),
        (v_session2_id, v_week2_id, v_user_id, 1, v_routine_id, 'pending');

    -- 4. Insert Targets for Week 1 (Session 1)
    INSERT INTO mesocycle_session_targets (id, session_id, user_id, exercise_id, set_number, target_weight, target_reps, target_rir)
    VALUES
        (gen_random_uuid(), v_session1_id, v_user_id, '787b4691-dbb7-428a-88a6-b80cafd4d6f4', 1, 60, '10', 2),
        (gen_random_uuid(), v_session1_id, v_user_id, '787b4691-dbb7-428a-88a6-b80cafd4d6f4', 2, 60, '10', 2),
        (gen_random_uuid(), v_session1_id, v_user_id, 'b19b6528-8dce-41bb-8a8e-26cdbd295217', 1, 40, '12', 2),
        (gen_random_uuid(), v_session1_id, v_user_id, 'b19b6528-8dce-41bb-8a8e-26cdbd295217', 2, 40, '12', 2);

    -- 5. Insert Targets for Week 2 (Session 2) - Applying Progressive Overload (+2.5kg)
    INSERT INTO mesocycle_session_targets (id, session_id, user_id, exercise_id, set_number, target_weight, target_reps, target_rir)
    VALUES
        (gen_random_uuid(), v_session2_id, v_user_id, '787b4691-dbb7-428a-88a6-b80cafd4d6f4', 1, 62.5, '10', 1),
        (gen_random_uuid(), v_session2_id, v_user_id, '787b4691-dbb7-428a-88a6-b80cafd4d6f4', 2, 62.5, '10', 1),
        (gen_random_uuid(), v_session2_id, v_user_id, 'b19b6528-8dce-41bb-8a8e-26cdbd295217', 1, 42.5, '12', 1),
        (gen_random_uuid(), v_session2_id, v_user_id, 'b19b6528-8dce-41bb-8a8e-26cdbd295217', 2, 42.5, '12', 1);

END $$;
