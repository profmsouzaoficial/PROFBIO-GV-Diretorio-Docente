
-- ==========================================
-- 4. TABELA DE CANDIDATOS À ORIENTAÇÃO
-- ==========================================

CREATE TABLE IF NOT EXISTS candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id UUID NOT NULL REFERENCES professors(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  student_email TEXT NOT NULL,
  student_whatsapp TEXT NOT NULL,
  lattes_url TEXT NOT NULL,
  presentation_text TEXT NOT NULL,
  photo_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ativar RLS
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para Candidatos
-- 1. Qualquer pessoa (estudante) pode inserir uma candidatura
CREATE POLICY "Public can apply" ON candidates FOR INSERT WITH CHECK (true);

-- 2. Apenas o professor dono do perfil pode ver seus candidatos
CREATE POLICY "Professors can view own candidates" ON candidates FOR SELECT TO authenticated
USING ( professor_id IN (SELECT id FROM professors WHERE user_id = auth.uid()) );

-- 3. Apenas o professor dono do perfil pode atualizar o status (aceitar/recusar)
CREATE POLICY "Professors can manage own candidates" ON candidates FOR UPDATE TO authenticated
USING ( professor_id IN (SELECT id FROM professors WHERE user_id = auth.uid()) );

-- ==========================================
-- 5. STORAGE - BUCKET PARA FOTOS DE CANDIDATOS
-- ==========================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('candidate_photos', 'candidate_photos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage para candidate_photos
CREATE POLICY "Public read for candidate photos" ON storage.objects FOR SELECT USING (bucket_id = 'candidate_photos');
CREATE POLICY "Public upload for candidate photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'candidate_photos');
CREATE POLICY "Professors manage candidate photos" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'candidate_photos');
