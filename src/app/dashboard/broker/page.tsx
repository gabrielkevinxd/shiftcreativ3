'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { getOptimizedPricing, PACK_CONFIGS } from '@/lib/pricing';
import { 
  Folder, Selection, Clock, CheckCircle, Download, FileText, 
  ArrowRight, SignOut, Eye, Image as ImageIcon, Video, DeviceMobile
} from '@phosphor-icons/react';

interface FileItem {
  id: string;
  name: string;
  file_type: 'photo' | 'drone' | 'video' | 'ia';
  url_preview: string;
  selected: boolean;
}

interface Project {
  id: string;
  title: string;
  description: string;
  base_pack: 'pack1' | 'pack2' | 'pack3';
  status: 'active' | 'completed' | 'expired';
  created_at: string;
  completed_at: string | null;
  expires_at: string | null;
  final_price: number | null;
  summary_billing: any | null;
}

export default function BrokerDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [downloadLinks, setDownloadLinks] = useState<{ name: string; url: string }[]>([]);
  const [isCompleting, setIsCompleting] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUser(session.user);
      fetchProjects(session.user.id);
    };

    checkUser();
  }, []);

  const fetchProjects = async (userId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from('shift_projects')
      .select('*')
      .eq('broker_id', userId)
      .order('created_at', { ascending: false });

    if (data) {
      setProjects(data as any);
    }
    setLoading(false);
  };

  const loadProjectFiles = async (project: Project) => {
    setSelectedProject(project);
    setDownloadLinks([]);

    // Buscar mídias
    const { data: dbFiles } = await supabase
      .from('shift_project_files')
      .select('*')
      .eq('project_id', project.id);

    // Buscar seleções ativas do usuário
    const { data: dbSelections } = await supabase
      .from('shift_selections')
      .select('*')
      .eq('project_id', project.id);

    if (dbFiles) {
      const enriched = dbFiles.map(file => {
        const isSelected = dbSelections?.find(s => s.file_id === file.id)?.selected;
        return {
          id: file.id,
          name: file.name,
          file_type: file.file_type,
          url_preview: file.url_preview,
          selected: isSelected !== undefined ? isSelected : false,
        };
      });
      setFiles(enriched);
    }

    // Se o projeto já estiver finalizado, puxa as URLs de download
    if (project.status === 'completed') {
      fetchDownloadUrls(project.id);
    }
  };

  const toggleSelectFile = async (fileId: string) => {
    if (!selectedProject || selectedProject.status !== 'active') return;

    const file = files.find(f => f.id === fileId);
    if (!file) return;

    const newSelectedState = !file.selected;

    // Atualiza estado local
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, selected: newSelectedState } : f));

    // Salva na DB
    const { error } = await supabase
      .from('shift_selections')
      .upsert({
        project_id: selectedProject.id,
        file_id: fileId,
        selected: newSelectedState,
      }, { onConflict: 'project_id,file_id' });

    if (error) {
      console.error('Erro ao salvar seleção:', error);
    }
  };

  // Cálculo Dinâmico de Preços
  const selectedCounts = {
    photos: files.filter(f => f.file_type === 'photo' && f.selected).length,
    drone: files.filter(f => f.file_type === 'drone' && f.selected).length,
    ia: files.filter(f => f.file_type === 'ia' && f.selected).length,
    videosCount: files.filter(f => f.file_type === 'video' && f.selected).length,
  };

  const pricing = getOptimizedPricing(selectedCounts);
  const currentCost = pricing.recommended.total;
  const currentPackLabel = pricing.recommended.packLabel;

  // Finalizar a seleção e liberar downloads
  const handleConfirmAndDownload = async () => {
    if (!selectedProject) return;
    
    const selectedFiles = files.filter(f => f.selected);
    if (selectedFiles.length === 0) {
      alert('Selecione pelo menos uma foto ou vídeo para baixar.');
      return;
    }

    if (!confirm(`Confirmar faturamento de ${currentCost}€ sob o plano ${currentPackLabel}?\nSua seleção será congelada e os downloads em alta resolução originais serão liberados.`)) {
      return;
    }

    setIsCompleting(true);

    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pricingBreakdown: pricing.recommended,
          selectedCounts,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setDownloadLinks(data.downloadLinks);
        // Recarrega projeto
        const { data: updatedProj } = await supabase
          .from('shift_projects')
          .select('*')
          .eq('id', selectedProject.id)
          .single();
        
        if (updatedProj) {
          setSelectedProject(updatedProj as any);
          setProjects(prev => prev.map(p => p.id === updatedProj.id ? (updatedProj as any) : p));
        }
      } else {
        alert(data.error || 'Erro ao processar downloads.');
      }
    } catch (e) {
      alert('Erro de conexão ao processar downloads.');
    } finally {
      setIsCompleting(false);
    }
  };

  const fetchDownloadUrls = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/download`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setDownloadLinks(data.downloadLinks);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-height-100vh flex items-center justify-center bg-bg text-teal" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--teal)' }}>
        A carregar os teus projetos...
      </div>
    );
  }

  return (
    <div className="relative min-height-100vh bg-bg text-text" style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Barra superior */}
      <nav id="nav" style={{ position: 'sticky', top: 0 }}>
        <div className="nav-in" style={{ height: '60px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/logo.png" alt="Shift" style={{ height: '24px' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 900, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--teal)' }}>
              Área do Cliente
            </span>
          </div>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <button 
              onClick={handleSignOut}
              className="btn-s"
              style={{ padding: '6px 12px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <SignOut size={14} />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Conteúdo Principal */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 16px', display: 'grid', gridTemplateColumns: selectedProject ? '1fr 340px' : '1fr', gap: '32px' }}>
        
        {/* Lado Esquerdo: Projetos ou Galeria */}
        <div>
          {/* Se nenhum projeto selecionado, lista os projetos */}
          {!selectedProject ? (
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '24px', textTransform: 'uppercase' }}>Os Meus Projetos</h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {projects.length === 0 ? (
                  <p style={{ color: 'var(--muted)' }}>Nenhum projeto encontrado para esta conta.</p>
                ) : (
                  projects.map(p => (
                    <div 
                      key={p.id}
                      onClick={() => loadProjectFiles(p)}
                      style={{ background: 'var(--color-surface)', border: '1px solid rgba(71,241,228,0.1)', padding: '24px', borderRadius: '8px', cursor: 'pointer', transition: 'transform 0.2s', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <span style={{ fontSize: '0.6rem', color: 'var(--teal)', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>
                            {p.base_pack.toUpperCase()}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', color: p.status === 'completed' ? 'var(--teal)' : 'var(--muted)' }}>
                            {p.status === 'completed' ? <CheckCircle size={14} /> : <Clock size={14} />}
                            {p.status.toUpperCase()}
                          </span>
                        </div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text)', marginBottom: '8px' }}>{p.title}</h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--muted)', lineHeight: '1.4' }}>{p.description || 'Sem descrição.'}</p>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '16px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                          {new Date(p.created_at).toLocaleDateString()}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'var(--teal)', fontWeight: 700 }}>
                          Ver mídias <ArrowRight size={14} />
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            // Galeria do Projeto Selecionado
            <div>
              <button 
                onClick={() => setSelectedProject(null)}
                className="btn-s"
                style={{ padding: '6px 12px', marginBottom: '24px' }}
              >
                ← Voltar aos projetos
              </button>

              <div style={{ marginBottom: '24px' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--teal)', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>
                  Projeto
                </span>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 900, marginTop: '4px' }}>{selectedProject.title}</h2>
                <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: '4px' }}>{selectedProject.description}</p>
              </div>

              {selectedProject.status === 'expired' ? (
                <div style={{ padding: '24px', background: 'rgba(255,107,107,0.05)', border: '1px solid rgba(255,107,107,0.2)', borderRadius: '6px', color: '#ff8080', fontSize: '0.85rem' }}>
                  ⚠️ **Este projeto expirou.** Os arquivos originais foram limpos do nosso servidor conforme a política de 30 dias após o download. Entre em contato se precisar restaurá-los.
                </div>
              ) : (
                // Exibe as fotos e vídeos para seleção
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 900, marginBottom: '16px', textTransform: 'uppercase' }}>Imagens Disponíveis</h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                    {files.map(file => (
                      <div 
                        key={file.id}
                        style={{ 
                          position: 'relative', 
                          aspectRatio: '1', 
                          background: 'var(--color-surface)', 
                          borderRadius: '8px', 
                          overflow: 'hidden', 
                          border: file.selected ? '2px solid var(--teal)' : '1px solid rgba(255,255,255,0.06)',
                          cursor: selectedProject.status === 'active' ? 'pointer' : 'default'
                        }}
                        onClick={() => toggleSelectFile(file.id)}
                      >
                        {file.file_type === 'video' ? (
                          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', gap: '8px' }}>
                            <Video size={32} style={{ color: 'var(--teal)' }} />
                            <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Vídeo Reels</span>
                          </div>
                        ) : (
                          <img 
                            src={file.url_preview} 
                            alt={file.name} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          />
                        )}

                        {/* Botão de Ampliar / Ver Lighbox */}
                        {file.file_type !== 'video' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLightboxImage(file.url_preview);
                            }}
                            style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '4px', padding: '6px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <Eye size={12} />
                          </button>
                        )}

                        {/* Checkbox de seleção */}
                        {selectedProject.status === 'active' && (
                          <div 
                            style={{ 
                              position: 'absolute', 
                              top: '8px', 
                              right: '8px', 
                              width: '20px', 
                              height: '20px', 
                              borderRadius: '4px', 
                              border: '2px solid var(--teal)', 
                              background: file.selected ? 'var(--teal)' : 'transparent',
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              color: '#000',
                              fontSize: '0.7rem',
                              fontWeight: 'bold'
                            }}
                          >
                            {file.selected && '✓'}
                          </div>
                        )}

                        {/* Label do tipo */}
                        <div style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: '3px', fontSize: '0.55rem', color: 'var(--teal)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                          {file.file_type}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Lado Direito: Painel de Faturamento (Apenas se tiver projeto selecionado) */}
        {selectedProject && (
          <aside>
            <div style={{ background: 'var(--color-surface)', border: '1px solid rgba(71,241,228,0.15)', borderRadius: '8px', padding: '24px', position: 'sticky', top: '92px' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 900, marginBottom: '20px', textTransform: 'uppercase', color: 'var(--teal)' }}>
                Faturamento e Plano
              </h3>

              {/* Status do faturamento */}
              {selectedProject.status === 'active' ? (
                <div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--muted)' }}>
                      <span>Pacote Escolhido:</span>
                      <span style={{ fontWeight: 'bold', color: '#fff' }}>{PACK_CONFIGS[selectedProject.base_pack].label}</span>
                    </div>

                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                      <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700 }}>Resumo de Itens Selecionados</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px', fontSize: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Fotos Normais:</span>
                          <span>{selectedCounts.photos} / {pricing.recommended.includedPhotos}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Fotos Drone:</span>
                          <span>{selectedCounts.drone} / {pricing.recommended.includedDrone}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Fotos IA:</span>
                          <span>{selectedCounts.ia} / {pricing.recommended.includedIa === 9999 ? 'Ilimitado' : pricing.recommended.includedIa}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Vídeos:</span>
                          <span>{selectedCounts.videosCount} / 1</span>
                        </div>
                      </div>
                    </div>

                    {/* Detalhes de Extras */}
                    {(pricing.recommended.extraPhotos > 0 || pricing.recommended.extraDrone > 0 || pricing.recommended.extraIa > 0 || pricing.recommended.extraVideosCost > 0) && (
                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.03)', fontSize: '0.7rem' }}>
                        <span style={{ fontWeight: 'bold', color: 'var(--teal)', display: 'block', marginBottom: '6px' }}>Adicionais / Extras:</span>
                        {pricing.recommended.extraPhotos > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span>{pricing.recommended.extraPhotos} Fotos Extras:</span>
                            <span>+{pricing.recommended.extraPhotosCost}€</span>
                          </div>
                        )}
                        {pricing.recommended.extraDrone > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span>{pricing.recommended.extraDrone} Drone Extras:</span>
                            <span>+{pricing.recommended.extraDroneCost}€</span>
                          </div>
                        )}
                        {pricing.recommended.extraIa > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span>{pricing.recommended.extraIa} Imagens IA Extras:</span>
                            <span>+{pricing.recommended.extraIaCost}€</span>
                          </div>
                        )}
                        {pricing.recommended.extraVideosCost > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Vídeos Extras:</span>
                            <span>+{pricing.recommended.extraVideosCost}€</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Recomendação de Plano Inteligente */}
                    {pricing.recommended.packKey !== selectedProject.base_pack && (
                      <div style={{ background: 'rgba(71,241,228,0.08)', border: '1px solid var(--teal)', padding: '10px', borderRadius: '4px', fontSize: '0.68rem', color: 'var(--teal)' }}>
                        💡 **Recomendação:** O sistema otimizou automaticamente o faturamento para o plano **{pricing.recommended.packLabel}**, que é a opção mais econômica com base na sua seleção!
                      </div>
                    )}
                  </div>

                  <div style={{ borderTop: '1px solid rgba(71,241,228,0.2)', paddingTop: '20px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 900 }}>Total Final:</span>
                      <span style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--teal)' }}>{currentCost}€</span>
                    </div>
                  </div>

                  <button 
                    onClick={handleConfirmAndDownload}
                    disabled={isCompleting}
                    className="btn-p"
                    style={{ width: '100%', justifyContent: 'center', gap: '8px' }}
                  >
                    <Download weight="bold" size={16} />
                    <span>{isCompleting ? 'Processando...' : 'Finalizar e Baixar'}</span>
                  </button>
                </div>
              ) : (
                // Projeto finalizado/pago
                <div>
                  <div style={{ padding: '16px', background: 'rgba(71,241,228,0.08)', border: '1px solid var(--teal)', borderRadius: '6px', color: 'var(--teal)', fontSize: '0.75rem', marginBottom: '24px', textAlign: 'center' }}>
                    ✓ **Seleção Finalizada**
                    <p style={{ fontSize: '0.65rem', color: 'var(--muted)', marginTop: '4px' }}>
                      Faturamento total: {selectedProject.final_price}€
                    </p>
                  </div>

                  <div style={{ marginBottom: '24px', fontSize: '0.72rem', color: 'var(--muted)', lineHeight: '1.5' }}>
                    <p>📅 **Finalizado em:** {selectedProject.completed_at ? new Date(selectedProject.completed_at).toLocaleDateString() : ''}</p>
                    <p style={{ color: 'var(--teal)', marginTop: '4px' }}>
                      ⌛ **Disponível até:** {selectedProject.expires_at ? new Date(selectedProject.expires_at).toLocaleDateString() : ''}
                    </p>
                  </div>

                  <h4 style={{ fontSize: '0.75rem', fontWeight: 900, marginBottom: '12px', textTransform: 'uppercase' }}>Downloads Disponíveis</h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {downloadLinks.length === 0 ? (
                      <p style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Carregando links de alta resolução...</p>
                    ) : (
                      downloadLinks.map((link, idx) => (
                        <a 
                          key={idx}
                          href={link.url}
                          download={link.name}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-s"
                          style={{ width: '100%', fontSize: '0.7rem', padding: '10px', display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}
                        >
                          <Download size={14} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link.name}</span>
                        </a>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div 
          onClick={() => setLightboxImage(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
        >
          <img 
            src={lightboxImage} 
            alt="Preview Ampliado" 
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '4px', border: '1px solid rgba(71,241,228,0.3)', boxShadow: '0 0 30px rgba(71,241,228,0.15)' }} 
          />
        </div>
      )}
    </div>
  );
}
