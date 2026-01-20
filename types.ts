
import type { Session, User } from '@supabase/supabase-js';

export type ProductType = 
  | 'Artigo' 
  | 'Conjunto de Dados' 
  | 'Repositório' 
  | 'Apresentação' 
  | 'Aplicativo' 
  | 'Livro' 
  | 'Revista em Quadrinhos' 
  | 'Jogo Digital' 
  | 'Sequência Didática' 
  | 'Automação de Processos Pedagógicos' 
  | 'Outro';

export interface Product {
  id: number;
  type: ProductType;
  title: string;
  url: string;
}

export interface Dissertation {
  id: string;
  professor_id: string;
  title: string;
  student_name: string;
  year: number;
  status: 'concluded' | 'in_progress';
  advisor_role: 'orientador' | 'coorientador';
  pdf_url?: string;
  summary: string;
  podcast_url?: string;
  products: Product[];
}

export interface Candidate {
  id: string;
  professor_id: string;
  student_name: string;
  student_email: string;
  student_whatsapp: string;
  lattes_url: string;
  presentation_text: string;
  photo_url?: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

export interface Professor {
  id: string;
  user_id?: string;
  name: string;
  title: string;
  mini_bio: string;
  lines_of_research: string[];
  lattes_url: string;
  public_email: string;
  photo_url: string;
  dissertations: Dissertation[];
  candidates?: Candidate[];
  disponivel: boolean;
  is_admin: boolean;
}

export type AuthSession = Session;
export type AuthUser = User;
