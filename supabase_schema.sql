
-- ==========================================
-- 1. TABELAS DO BANCO DE DADOS (Schema Public)
-- ==========================================

-- TABELA DE PROFESSORES
CREATE TABLE IF NOT EXISTS professors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  mini_bio TEXT NOT NULL,
  lines_of_research TEXT[] NOT NULL DEFAULT '{}',
  lattes_url TEXT,
  public_email TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABELA DE DISSERTAÇÕES
CREATE TABLE IF NOT EXISTS dissertations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id UUID NOT NULL REFERENCES professors(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  student_name TEXT NOT NULL,
  year INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'concluded',
  advisor_role TEXT DEFAULT 'orientador',
  pdf_url TEXT,
  summary TEXT NOT NULL,
  podcast_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABELA DE PRODUTOS EDUCACIONAIS
CREATE TABLE IF NOT EXISTS products (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  dissertation_id UUID NOT NULL REFERENCES dissertations(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'Outro',
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 2. CONFIGURAÇÃO DO STORAGE (Buckets)
-- ==========================================

-- Criar os buckets necessários no schema 'storage'
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('avatars', 'avatars', true),
  ('pdfs', 'pdfs', true),
  ('podcasts', 'podcasts', true)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- 3. POLÍTICAS DE SEGURANÇA (RLS) PARA STORAGE
-- ==========================================

-- Nota: Estas políticas permitem que qualquer pessoa veja os arquivos (Público),
-- mas apenas usuários autenticados (professores logados) possam subir arquivos.

-- Limpar políticas existentes para evitar erros de duplicata ao rodar o script novamente
DROP POLICY IF EXISTS "Acesso de Leitura Pública" ON storage.objects;
DROP POLICY IF EXISTS "Upload para Usuários Autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Gestão de Arquivos Próprios" ON storage.objects;

-- 1. Permitir leitura pública de todos os objetos nos buckets especificados
CREATE POLICY "Acesso de Leitura Pública"
ON storage.objects FOR SELECT
USING ( bucket_id IN ('avatars', 'pdfs', 'podcasts') );

-- 2. Permitir inserção (Upload) para qualquer usuário autenticado
CREATE POLICY "Upload para Usuários Autenticados"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id IN ('avatars', 'pdfs', 'podcasts') );

-- 3. Permitir Update e Delete para usuários autenticados
CREATE POLICY "Gestão de Arquivos Próprios"
ON storage.objects FOR ALL
TO authenticated
USING ( bucket_id IN ('avatars', 'pdfs', 'podcasts') );
