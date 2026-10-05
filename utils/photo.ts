/**
 * Utilitários para normalização e tratamento de fotos dos docentes
 * Suporta formatos GIF, PNG, JPG, WebP e fotos provenientes do Currículo Lattes / CNPq / Supabase.
 */

export const normalizePhotoUrl = (url: string | undefined | null, name?: string): string => {
  if (!url || !url.trim()) {
    return getAvatarFallback(name);
  }

  const trimmed = url.trim();

  // Se for o link do painel do Supabase Storage copiado da barra de navegação,
  // converte para a URL pública direta da imagem
  // Exemplo: https://supabase.com/dashboard/project/zvrrrakybjzelyavrqhc/storage/files/buckets/professor_photos?preview=fred.gif
  const dashboardMatch = trimmed.match(
    /supabase\.com\/dashboard\/project\/([^/]+)\/storage\/files\/buckets\/([^?]+).*?[?&]preview=([^&]+)/
  );
  if (dashboardMatch) {
    const [, projectRef, bucket, fileName] = dashboardMatch;
    return `https://${projectRef}.supabase.co/storage/v1/object/public/${bucket}/${decodeURIComponent(fileName)}`;
  }

  // Se for URL HTTP do CNPq / Lattes, atualiza para HTTPS para evitar bloqueio por Mixed Content
  if (trimmed.startsWith('http://servicosweb.cnpq.br')) {
    return trimmed.replace('http://', 'https://');
  }

  return trimmed;
};

export const getAvatarFallback = (name?: string): string => {
  const safeName = (name || 'Docente').trim();
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(safeName)}&background=034C83&color=fff&bold=true`;
};
