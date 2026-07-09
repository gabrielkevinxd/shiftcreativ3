'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { getOptimizedPricing, PACK_CONFIGS } from '@/lib/pricing';
import { 
  Folder, Selection, Clock, CheckCircle, Download, FileText, 
  ArrowRight, SignOut, Eye, Image as ImageIcon, Video, DeviceMobile,
  User, Lock, ShieldCheck, HouseLine, Info, Info as InfoIcon
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

interface Profile {
  full_name: string;
  company_name: string;
  email: string;
}

export default function BrokerDashboard() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'projects' | 'profile'>('projects');
  
  // Data lists
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [downloadLinks, setDownloadLinks] = useState<{ name: string; url: string }[]>([]);
  const [isCompleting, setIsCompleting] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Edit Profile Form
  const [editName, setEditName] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [profileMsg, setProfileMsg] = useState({ text: '', type: '' });

  // Change Password Form
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdMsg, setPwdMsg] = useState({ text: '', type: '' });

  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUser(session.user);
      fetchProfile(session.user.id);
      fetchProjects(session.user.id);
    };

    checkUser();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('shift_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) {
      setProfile(data);
      setEditName(data.full_name || '');
      setEditCompany(data.company_name || '');
    }
  };

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
        // Recarrega projeto e lista de projetos
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

  const handleUpdateProfile = async (e: FormEvent) => {
    e.preventDefault();
    setProfileMsg({ text: 'A guardar...', type: 'info' });

    const { error } = await supabase
      .from('shift_profiles')
      .update({
        full_name: editName,
        company_name: editCompany,
      })
      .eq('id', user.id);

    if (error) {
      setProfileMsg({ text: 'Erro ao atualizar dados: ' + error.message, type: 'err' });
    } else {
      setProfileMsg({ text: 'Dados guardados com sucesso!', type: 'success' });
      fetchProfile(user.id);
    }
  };

  const handleUpdatePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPwdMsg({ text: 'As palavras-passe não coincidem.', type: 'err' });
      return;
    }

    setPwdMsg({ text: 'A atualizar...', type: 'info' });

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setPwdMsg({ text: 'Erro ao alterar palavra-passe: ' + error.message, type: 'err' });
    } else {
      setPwdMsg({ text: 'Palavra-passe alterada com sucesso!', type: 'success' });
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Estatísticas do Corretor
  const totalProjects = projects.length;
  const completedProjects = projects.filter(p => p.status === 'completed').length;
  const activeProjects = projects.filter(p => p.status === 'active').length;
  const totalInvoiced = projects
    .filter(p => p.status === 'completed' && p.final_price !== null)
    .reduce((sum, p) => sum + Number(p.final_price), 0);

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
      <nav id="nav" style={{ position: 'sticky', top: 0, zIndex: 100 }}>
        <div className="nav-in" style={{ height: '60px' }}>
          <div 
            onClick={() => { setSelectedProject(null); setActiveTab('projects'); }}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
          >
            <img src="/logo.png" alt="Shift" style={{ height: '24px' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 900, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--teal)' }}>
              Área do Cliente
            </span>
          </div>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <button 
              onClick={() => setActiveTab('projects')}
              className={`btn-s ${activeTab === 'projects' && !selectedProject ? 'on' : ''}`}
              style={{ padding: '6px 12px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Folder size={14} />
              <span>Projetos</span>
            </button>

            <button 
              onClick={() => setActiveTab('profile')}
              className={`btn-s ${activeTab === 'profile' ? 'on' : ''}`}
              style={{ padding: '6px 12px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <User size={14} />
              <span>Perfil</span>
            </button>

            <button 
              onClick={handleSignOut}
              className="btn-s"
              style={{ padding: '6px 12px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '6px', borderColor: 'rgba(255,107,107,0.2)', color: '#ff8080' }}
            >
              <SignOut size={14} />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Container Principal */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 16px' }}>
        
        {/* Banner de Boas-vindas */}
        {!selectedProject && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(27,27,32,0.3)', border: '1px solid rgba(255,255,255,0.03)', padding: '24px', borderRadius: '8px', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <span style={{ fontSize: '0.65rem', color: 'var(--teal)', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>
                Painel do Consultor
              </span>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 900, marginTop: '4px', letterSpacing: '-0.5px' }}>
                Olá, {profile?.full_name || user?.email}!
              </h1>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <HouseLine size={14} /> {profile?.company_name || 'Consultor Imobiliário'}
              </p>
            </div>
            
            {/* Stats Rápido */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ background: 'var(--color-surface)', border: '1px solid rgba(255,255,255,0.03)', padding: '12px 20px', borderRadius: '6px', textAlign: 'center', minWidth: '100px' }}>
                <span style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--teal)', display: 'block' }}>{totalProjects}</span>
                <span style={{ fontSize: '0.6rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700 }}>Projetos</span>
              </div>
              <div style={{ background: 'var(--color-surface)', border: '1px solid rgba(255,255,255,0.03)', padding: '12px 20px', borderRadius: '6px', textAlign: 'center', minWidth: '100px' }}>
                <span style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--teal)', display: 'block' }}>{activeProjects}</span>
                <span style={{ fontSize: '0.6rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700 }}>Ativos</span>
              </div>
              <div style={{ background: 'var(--color-surface)', border: '1px solid rgba(255,255,255,0.03)', padding: '12px 20px', borderRadius: '6px', textAlign: 'center', minWidth: '100px' }}>
                <span style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--teal)', display: 'block' }}>{totalInvoiced}€</span>
                <span style={{ fontSize: '0.6rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700 }}>Faturado</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: PROJETOS */}
        {activeTab === 'projects' && (
          <div style={{ display: 'grid', gridTemplateColumns: selectedProject ? '1fr 340px' : '1fr', gap: '32px' }}>
            
            {/* Lado Esquerdo: Projetos ou Galeria */}
            <div>
              {!selectedProject ? (
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Os Meus Projetos
                  </h2>
                  
                  {projects.length === 0 ? (
                    // Onboarding/Tutorial State when Empty
                    <div style={{ background: 'rgba(27,27,32,0.4)', border: '1px solid rgba(255,255,255,0.04)', padding: '40px 24px', borderRadius: '8px', textAlign: 'center' }}>
                      <Folder size={48} style={{ color: 'var(--teal)', margin: '0 auto 16px auto', opacity: 0.8 }} />
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 900, marginBottom: '8px' }}>Não tens projetos ativos</h3>
                      <p style={{ color: 'var(--muted)', fontSize: '0.82rem', maxWidth: '480px', margin: '0 auto 32px auto', lineHeight: '1.5' }}>
                        Quando a nossa equipa realizar a produção de fotos e vídeos dos teus imóveis, eles aparecerão aqui para poderes selecionar e baixar em alta resolução.
                      </p>
                      
                      {/* Tutorial Passos */}
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '32px', maxWidth: '720px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '24px' }}>
                        <div style={{ textAlign: 'left', background: 'var(--color-surface)', padding: '16px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.02)' }}>
                          <span style={{ background: 'rgba(71,241,228,0.1)', color: 'var(--teal)', fontSize: '0.75rem', fontWeight: 900, padding: '4px 8px', borderRadius: '4px', display: 'inline-block', marginBottom: '12px' }}>01</span>
                          <h4 style={{ fontSize: '0.8rem', fontWeight: 900, marginBottom: '6px' }}>Captação e Edição</h4>
                          <p style={{ fontSize: '0.7rem', color: 'var(--muted)', lineHeight: '1.4' }}>Captamos e editamos as fotos do teu imóvel com tecnologia profissional e IA.</p>
                        </div>
                        
                        <div style={{ textAlign: 'left', background: 'var(--color-surface)', padding: '16px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.02)' }}>
                          <span style={{ background: 'rgba(71,241,228,0.1)', color: 'var(--teal)', fontSize: '0.75rem', fontWeight: 900, padding: '4px 8px', borderRadius: '4px', display: 'inline-block', marginBottom: '12px' }}>02</span>
                          <h4 style={{ fontSize: '0.8rem', fontWeight: 900, marginBottom: '6px' }}>Seleção Interativa</h4>
                          <p style={{ fontSize: '0.7rem', color: 'var(--muted)', lineHeight: '1.4' }}>Entras no portal, vês as fotos com marca d&apos;água e escolhes apenas as que queres.</p>
                        </div>

                        <div style={{ textAlign: 'left', background: 'var(--color-surface)', padding: '16px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.02)' }}>
                          <span style={{ background: 'rgba(71,241,228,0.1)', color: 'var(--teal)', fontSize: '0.75rem', fontWeight: 900, padding: '4px 8px', borderRadius: '4px', display: 'inline-block', marginBottom: '12px' }}>03</span>
                          <h4 style={{ fontSize: '0.8rem', fontWeight: 900, marginBottom: '6px' }}>Preço Otimizado</h4>
                          <p style={{ fontSize: '0.7rem', color: 'var(--muted)', lineHeight: '1.4' }}>O sistema calcula dinamicamente o faturamento sugerindo o plano mais barato para ti.</p>
                        </div>

                        <div style={{ textAlign: 'left', background: 'var(--color-surface)', padding: '16px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.02)' }}>
                          <span style={{ background: 'rgba(71,241,228,0.1)', color: 'var(--teal)', fontSize: '0.75rem', fontWeight: 900, padding: '4px 8px', borderRadius: '4px', display: 'inline-block', marginBottom: '12px' }}>04</span>
                          <h4 style={{ fontSize: '0.8rem', fontWeight: 900, marginBottom: '6px' }}>Download em Alta</h4>
                          <p style={{ fontSize: '0.7rem', color: 'var(--muted)', lineHeight: '1.4' }}>Confirmas e fazes o download dos originais de alta qualidade na hora. Ficam salvos por 30 dias.</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                      {projects.map(p => (
                        <div 
                          key={p.id}
                          onClick={() => loadProjectFiles(p)}
                          style={{ background: 'var(--color-surface)', border: '1px solid rgba(71,241,228,0.08)', padding: '24px', borderRadius: '8px', cursor: 'pointer', transition: 'transform 0.2s', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
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
                      ))}
                    </div>
                  )}
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

                  {selectedProject.status === 'active' ? (
                    <div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--muted)' }}>
                          <span>Pacote Escolhido:</span>
                          <span style={{ fontWeight: 'bold', color: '#fff' }}>{PACK_CONFIGS[selectedProject.base_pack].label}</span>
                        </div>

                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                          <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700 }}>Resumo de Itens</span>
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

                        {pricing.recommended.packKey !== selectedProject.base_pack && (
                          <div style={{ background: 'rgba(71,241,228,0.08)', border: '1px solid var(--teal)', padding: '10px', borderRadius: '4px', fontSize: '0.68rem', color: 'var(--teal)' }}>
                            💡 **Recomendação:** O sistema otimizou o faturamento para o plano **{pricing.recommended.packLabel}**, que é a opção mais econômica com base na sua seleção!
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

                      <h4 style={{ fontSize: '0.75rem', fontWeight: 900, marginBottom: '12px', textTransform: 'uppercase' }}>Downloads</h4>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {downloadLinks.length === 0 ? (
                          <p style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Carregando links...</p>
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
        )}

        {/* TAB 2: EDITAR PERFIL */}
        {activeTab === 'profile' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px' }}>
            
            {/* Form 1: Dados do Perfil */}
            <div style={{ background: 'var(--color-surface)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <User size={22} style={{ color: 'var(--teal)' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 900, textTransform: 'uppercase' }}>Dados Pessoais</h3>
              </div>

              {profileMsg.text && (
                <div style={{ padding: '12px', background: profileMsg.type === 'success' ? 'rgba(71,241,228,0.08)' : 'rgba(255,107,107,0.08)', border: profileMsg.type === 'success' ? '1px solid var(--teal)' : '1px solid #ff6b6b', borderRadius: '4px', color: profileMsg.type === 'success' ? 'var(--teal)' : '#ff6b6b', fontSize: '0.75rem', marginBottom: '20px' }}>
                  {profileMsg.text}
                </div>
              )}

              <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Nome Completo</label>
                  <input 
                    type="text" 
                    required 
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    style={{ width: '100%', background: 'var(--color-surface-low)' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Imobiliária / Empresa</label>
                  <input 
                    type="text" 
                    value={editCompany}
                    onChange={e => setEditCompany(e.target.value)}
                    style={{ width: '100%', background: 'var(--color-surface-low)' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Endereço de E-mail</label>
                  <input 
                    type="email" 
                    disabled 
                    value={profile?.email || ''}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.02)', color: 'var(--muted)', cursor: 'not-allowed' }}
                  />
                  <span style={{ fontSize: '0.6rem', color: 'var(--muted)', marginTop: '4px', display: 'block' }}>Para alterar o e-mail contacte a administração.</span>
                </div>

                <button type="submit" className="btn-p" style={{ marginTop: '12px', justifyContent: 'center' }}>
                  Guardar Alterações
                </button>
              </form>
            </div>

            {/* Form 2: Alterar Password */}
            <div style={{ background: 'var(--color-surface)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <Lock size={22} style={{ color: 'var(--teal)' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 900, textTransform: 'uppercase' }}>Segurança</h3>
              </div>

              {pwdMsg.text && (
                <div style={{ padding: '12px', background: pwdMsg.type === 'success' ? 'rgba(71,241,228,0.08)' : 'rgba(255,107,107,0.08)', border: pwdMsg.type === 'success' ? '1px solid var(--teal)' : '1px solid #ff6b6b', borderRadius: '4px', color: pwdMsg.type === 'success' ? 'var(--teal)' : '#ff6b6b', fontSize: '0.75rem', marginBottom: '20px' }}>
                  {pwdMsg.text}
                </div>
              )}

              <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Nova Palavra-passe</label>
                  <input 
                    type="password" 
                    required 
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    style={{ width: '100%', background: 'var(--color-surface-low)' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Confirmar Nova Palavra-passe</label>
                  <input 
                    type="password" 
                    required 
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repita a palavra-passe"
                    style={{ width: '100%', background: 'var(--color-surface-low)' }}
                  />
                </div>

                <button type="submit" className="btn-p" style={{ marginTop: '12px', justifyContent: 'center' }}>
                  Alterar Palavra-passe
                </button>
              </form>
            </div>

          </div>
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
