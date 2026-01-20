
-- ==========================================
-- ALTERAÇÃO NA TABELA DE PROFESSORES
-- ==========================================

ALTER TABLE professors ADD COLUMN IF NOT EXISTS disponivel BOOLEAN DEFAULT TRUE;
ALTER TABLE professors ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Atualizar políticas de RLS para permitir que Admins editem qualquer registro
-- Removemos a política antiga e criamos uma mais abrangente
DROP POLICY IF EXISTS "Professors can update own profile" ON professors;

CREATE POLICY "Professors or Admins can update profiles" ON professors
FOR UPDATE TO authenticated
USING (
  user_id = auth.uid() OR 
  (SELECT is_admin FROM professors WHERE user_id = auth.uid()) = TRUE
);

-- O mesmo para dissertações e produtos
DROP POLICY IF EXISTS "Professors manage own dissertations" ON dissertations;
CREATE POLICY "Professors or Admins manage dissertations" ON dissertations
FOR ALL TO authenticated
USING (
  professor_id IN (SELECT id FROM professors WHERE user_id = auth.uid()) OR
  (SELECT is_admin FROM professors WHERE user_id = auth.uid()) = TRUE
);

DROP POLICY IF EXISTS "Professors manage candidate photos" ON storage.objects;
CREATE POLICY "Professors or Admins manage storage" ON storage.objects
FOR ALL TO authenticated
USING (
  bucket_id IN ('avatars', 'pdfs', 'podcasts', 'candidate_photos') AND
  (SELECT is_admin FROM professors WHERE user_id = auth.uid()) = TRUE
);
