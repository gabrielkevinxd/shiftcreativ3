-- ========================================================
-- SCHEMA DE ENTREGA DE PROJETOS E FATURAMENTO - SHIFT CREATIV3
-- Cole este script no SQL Editor do seu Supabase (https://supabase.devlopereu.com)
-- ========================================================

-- 1. Tabela de Perfis de Usuários
CREATE TABLE IF NOT EXISTS public.shift_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    role TEXT NOT NULL CHECK (role IN ('admin', 'broker')) DEFAULT 'broker',
    company_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS em shift_profiles
ALTER TABLE public.shift_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Perfis visíveis por todos autenticados" 
ON public.shift_profiles FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Usuários podem atualizar o próprio perfil" 
ON public.shift_profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id);

CREATE POLICY "Admins podem fazer tudo em perfis" 
ON public.shift_profiles FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.shift_profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- 2. Tabela de Projetos
CREATE TABLE IF NOT EXISTS public.shift_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    broker_id UUID REFERENCES public.shift_profiles(id) ON DELETE SET NULL,
    base_pack TEXT NOT NULL CHECK (base_pack IN ('pack1', 'pack2', 'pack3', 'custom')) DEFAULT 'pack1',
    status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'expired')) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE, -- 30 dias após download do corretor (completed_at)
    final_price NUMERIC(10, 2),
    summary_billing JSONB -- Detalhamento final do plano e extras cobrados
);

-- Habilitar RLS em shift_projects
ALTER TABLE public.shift_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Corretores veem apenas seus próprios projetos" 
ON public.shift_projects FOR SELECT 
TO authenticated 
USING (broker_id = auth.uid());

CREATE POLICY "Admins controlam todos os projetos" 
ON public.shift_projects FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.shift_profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- 3. Tabela de Arquivos do Projeto
CREATE TABLE IF NOT EXISTS public.shift_project_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.shift_projects(id) ON DELETE CASCADE NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('photo', 'drone', 'video', 'ia')),
    name TEXT NOT NULL,
    url_high_res TEXT NOT NULL, -- Caminho no bucket privado
    url_preview TEXT NOT NULL,  -- Caminho no bucket público (com marca d'água)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS em shift_project_files
ALTER TABLE public.shift_project_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Corretores leem arquivos dos seus projetos" 
ON public.shift_project_files FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.shift_projects 
        WHERE id = project_id AND broker_id = auth.uid()
    )
);

CREATE POLICY "Admins gerenciam arquivos" 
ON public.shift_project_files FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.shift_profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- 4. Tabela de Seleções do Corretor
CREATE TABLE IF NOT EXISTS public.shift_selections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.shift_projects(id) ON DELETE CASCADE NOT NULL,
    file_id UUID REFERENCES public.shift_project_files(id) ON DELETE CASCADE NOT NULL,
    selected BOOLEAN DEFAULT TRUE NOT NULL,
    selected_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (project_id, file_id)
);

-- Habilitar RLS em shift_selections
ALTER TABLE public.shift_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Corretores leem e escrevem suas seleções" 
ON public.shift_selections FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.shift_projects 
        WHERE id = project_id AND broker_id = auth.uid() AND status = 'active'
    )
);

CREATE POLICY "Admins leem todas as seleções" 
ON public.shift_selections FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.shift_profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- 5. Trigger para criar perfil automaticamente no login inicial se criado pelo auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.shift_profiles (id, email, full_name, role)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'full_name', new.email), 'broker')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
