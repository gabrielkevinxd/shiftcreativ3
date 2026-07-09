'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  FolderPlus, Users, CloudArrowUp, Eye, FileText, CheckCircle, 
  Clock, Trash, SignOut, Plus, List, Database, BuildingOffice, UserPlus
} from '@phosphor-icons/react';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  company_name: string;
}

interface Project {
  id: string;
  title: string;
  description: string;
  base_pack: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  expires_at: string | null;
  final_price: number | null;
  shift_profiles: Profile | null;
}

interface UploadQueueItem {
  file: File;
  type: 'photo' | 'drone' | 'video' | 'ia';
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
}

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'projects' | 'create-project' | 'create-broker'>('projects');
  
  // Data lists
  const [projects, setProjects] = useState<Project[]>([]);
  const [brokers, setBrokers] = useState<Profile[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedProjectFiles, setSelectedProjectFiles] = useState<any[]>([]);

  // Create Project Form
  const [projTitle, setProjTitle] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [selectedBrokerId, setSelectedBrokerId] = useState('');
  const [basePack, setBasePack] = useState<'pack1' | 'pack2' | 'pack3'>('pack1');
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');

  // Create Broker Form
  const [brokerEmail, setBrokerEmail] = useState('');
  const [brokerPassword, setBrokerPassword] = useState('');
  const [brokerName, setBrokerName] = useState('');
  const [brokerCompany, setBrokerCompany] = useState('');
  const [brokerMsg, setBrokerMsg] = useState({ text: '', type: '' });

  const router = useRouter();

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('shift_profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profile && profile.role === 'admin') {
        setUser(session.user);
        setIsAdmin(true);
        fetchProjects();
        fetchBrokers();
      } else {
        router.push('/dashboard/broker');
      }
      setLoading(false);
    };

    checkAdmin();
  }, []);

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from('shift_projects')
      .select(`
        *,
        shift_profiles:broker_id (id, email, full_name, company_name)
      `)
      .order('created_at', { ascending: false });

    if (data) setProjects(data as any);
  };

  const fetchBrokers = async () => {
    const { data } = await supabase
      .from('shift_profiles')
      .select('*')
      .eq('role', 'broker')
      .order('full_name', { ascending: true });

    if (data) setBrokers(data);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const triggerStorageSetup = async () => {
    try {
      const res = await fetch('/api/admin/setup', { method: 'POST' });
      const data = await res.json();
      alert(data.message || 'Setup concluído');
    } catch (e) {
      alert('Erro ao rodar setup de storage');
    }
  };

  // Cadastrar Corretor
  const handleCreateBroker = async (e: FormEvent) => {
    e.preventDefault();
    setBrokerMsg({ text: 'Cadastrando...', type: 'info' });

    try {
      const res = await fetch('/api/admin/create-broker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: brokerEmail,
          password: brokerPassword,
          fullName: brokerName,
          companyName: brokerCompany,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setBrokerMsg({ text: 'Corretor criado com sucesso!', type: 'success' });
        setBrokerEmail('');
        setBrokerPassword('');
        setBrokerName('');
        setBrokerCompany('');
        fetchBrokers();
      } else {
        setBrokerMsg({ text: data.error || 'Erro ao criar corretor.', type: 'err' });
      }
    } catch (err) {
      setBrokerMsg({ text: 'Erro ao conectar com a API.', type: 'err' });
    }
  };

  // Canvas Watermarking client-side
  const addWatermarkToImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
          }

          // Redimensionar para largura amigável de preview
          const MAX_WIDTH = 1200;
          let width = img.width;
          let height = img.height;
          if (width > MAX_WIDTH) {
            height = (MAX_WIDTH / width) * height;
            width = MAX_WIDTH;
          }
          canvas.width = width;
          canvas.height = height;

          ctx.drawImage(img, 0, 0, width, height);

          // Estilo da Marca d'água
          ctx.save();
          ctx.font = 'bold 32px sans-serif';
          ctx.fillStyle = 'rgba(71, 241, 228, 0.22)';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          // Desenhar diagonal repetida
          ctx.translate(width / 2, height / 2);
          ctx.rotate(-Math.PI / 6);
          ctx.fillText('SHIFT CREATIV3', 0, 0);
          ctx.fillText('SHIFT CREATIV3', -width / 3, -height / 4);
          ctx.fillText('SHIFT CREATIV3', width / 3, height / 4);
          
          ctx.restore();

          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Blob generation failed'));
            }
          }, 'image/jpeg', 0.85);
        };
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('File read failed'));
      reader.readAsDataURL(file);
    });
  };

  // Gerenciar Fila de Arquivos
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files).map(file => {
        // Tentar inferir tipo pelo nome/extensão
        let type: 'photo' | 'drone' | 'video' | 'ia' = 'photo';
        if (file.type.startsWith('video/')) {
          type = 'video';
        } else if (file.name.toLowerCase().includes('drone')) {
          type = 'drone';
        } else if (file.name.toLowerCase().includes('ia')) {
          type = 'ia';
        }
        
        return {
          file,
          type,
          progress: 0,
          status: 'pending' as const
        };
      });
      setUploadQueue(prev => [...prev, ...selected]);
    }
  };

  const removeQueueItem = (index: number) => {
    setUploadQueue(prev => prev.filter((_, i) => i !== index));
  };

  const updateQueueItemType = (index: number, type: 'photo' | 'drone' | 'video' | 'ia') => {
    setUploadQueue(prev => prev.map((item, i) => i === index ? { ...item, type } : item));
  };

  // Criar Projeto e fazer Upload de tudo
  const handleCreateProject = async () => {
    if (!projTitle || !selectedBrokerId) {
      setUploadMsg('Título do projeto e corretor são obrigatórios.');
      return;
    }

    if (uploadQueue.length === 0) {
      setUploadMsg('Selecione pelo menos um arquivo para o projeto.');
      return;
    }

    setIsUploading(true);
    setUploadMsg('Criando projeto...');

    try {
      // 1. Criar o Projeto na DB
      const { data: project, error: projError } = await supabase
        .from('shift_projects')
        .insert({
          title: projTitle,
          description: projDesc,
          broker_id: selectedBrokerId,
          base_pack: basePack,
          status: 'active',
        })
        .select()
        .single();

      if (projError || !project) {
        throw new Error('Erro ao criar registro do projeto: ' + projError?.message);
      }

      // 2. Upload de cada arquivo
      for (let i = 0; i < uploadQueue.length; i++) {
        const item = uploadQueue[i];
        setUploadQueue(prev => prev.map((q, idx) => idx === i ? { ...q, status: 'uploading' } : q));

        const fileName = `${project.id}/${Date.now()}-${item.file.name}`;
        
        // Caminho dos arquivos nos buckets
        const pathOriginal = `originals/${fileName}`;
        const pathPreview = `previews/${fileName}`;

        let previewBlob: Blob | File = item.file;

        // Se for imagem, gerar marca d'água client-side para o preview
        if (item.type !== 'video' && item.file.type.startsWith('image/')) {
          try {
            previewBlob = await addWatermarkToImage(item.file);
          } catch (err) {
            console.error('Falha ao aplicar marca dágua, enviando imagem original como preview', err);
          }
        }

        // Upload Original (Privado)
        const { error: origUploadError } = await supabase.storage
          .from('shift-originals')
          .upload(pathOriginal, item.file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (origUploadError) {
          console.error(origUploadError);
          setUploadQueue(prev => prev.map((q, idx) => idx === i ? { ...q, status: 'failed' } : q));
          continue;
        }

        // Upload Preview (Público com Marca D'água)
        const { error: prevUploadError } = await supabase.storage
          .from('shift-previews')
          .upload(pathPreview, previewBlob, {
            cacheControl: '3600',
            upsert: false,
          });

        if (prevUploadError) {
          console.error(prevUploadError);
          setUploadQueue(prev => prev.map((q, idx) => idx === i ? { ...q, status: 'failed' } : q));
          continue;
        }

        // Recuperar URL pública do preview
        const { data: { publicUrl } } = supabase.storage
          .from('shift-previews')
          .getPublicUrl(pathPreview);

        // 3. Gravar arquivo no banco
        const { error: fileDbError } = await supabase
          .from('shift_project_files')
          .insert({
            project_id: project.id,
            file_type: item.type,
            name: item.file.name,
            url_high_res: pathOriginal,
            url_preview: publicUrl,
          });

        if (fileDbError) {
          console.error(fileDbError);
          setUploadQueue(prev => prev.map((q, idx) => idx === i ? { ...q, status: 'failed' } : q));
        } else {
          setUploadQueue(prev => prev.map((q, idx) => idx === i ? { ...q, status: 'completed', progress: 100 } : q));
        }
      }

      setUploadMsg('Projeto criado e mídias enviadas com sucesso!');
      setProjTitle('');
      setProjDesc('');
      setUploadQueue([]);
      fetchProjects();
      setTimeout(() => {
        setTab('projects');
        setUploadMsg('');
      }, 1500);

    } catch (err: any) {
      setUploadMsg(err.message || 'Erro inesperado durante o upload.');
    } finally {
      setIsUploading(false);
    }
  };

  // Carregar detalhes de um projeto selecionado
  const viewProjectDetails = async (project: Project) => {
    setSelectedProject(project);
    
    // Buscar arquivos
    const { data: files } = await supabase
      .from('shift_project_files')
      .select('*')
      .eq('project_id', project.id);
    
    // Buscar seleções
    const { data: selections } = await supabase
      .from('shift_selections')
      .select('*')
      .eq('project_id', project.id);

    if (files) {
      const enrichedFiles = files.map(file => {
        const sel = selections?.find(s => s.file_id === file.id);
        return {
          ...file,
          selected: sel ? sel.selected : false,
        };
      });
      setSelectedProjectFiles(enrichedFiles);
    }
  };

  const deleteProject = async (id: string) => {
    if (confirm('Tem certeza que deseja deletar este projeto? Todos os arquivos no storage também serão excluídos.')) {
      // 1. Pegar caminhos dos arquivos do projeto no storage
      const { data: files } = await supabase
        .from('shift_project_files')
        .select('url_high_res')
        .eq('project_id', id);

      if (files && files.length > 0) {
        const paths = files.map(f => f.url_high_res);
        
        // Deletar do storage original
        await supabase.storage.from('shift-originals').remove(paths);
        
        // Deletar do storage preview (caminhos são espelhados)
        const previewPaths = paths.map(p => p.replace('originals/', 'previews/'));
        await supabase.storage.from('shift-previews').remove(previewPaths);
      }

      // 2. Deletar do banco de dados (o cascade cuidará das tabelas filhas)
      const { error } = await supabase
        .from('shift_projects')
        .delete()
        .eq('id', id);

      if (error) {
        alert('Erro ao deletar projeto: ' + error.message);
      } else {
        setSelectedProject(null);
        fetchProjects();
      }
    }
  };

  if (loading) {
    return (
      <div className="min-height-100vh flex items-center justify-center bg-bg text-teal" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--teal)' }}>
        Carregando painel de administração...
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="relative min-height-100vh bg-bg text-text" style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Barra de Navegação Superior */}
      <nav id="nav" style={{ position: 'sticky', top: 0 }}>
        <div className="nav-in" style={{ height: '60px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/logo.png" alt="Shift" style={{ height: '24px' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 900, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--teal)' }}>
              Painel Admin
            </span>
          </div>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <button 
              onClick={triggerStorageSetup}
              title="Inicializar buckets de Storage"
              style={{ background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--muted)', padding: '6px', borderRadius: '4px' }}
            >
              <Database size={18} />
            </button>
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

      {/* Menu e Container Principal */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 16px', display: 'grid', gridTemplateColumns: '240px 1fr', gap: '32px' }}>
        
        {/* Sidebar */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button 
            onClick={() => { setTab('projects'); setSelectedProject(null); }}
            className={`btn-s ${tab === 'projects' ? 'on' : ''}`}
            style={{ width: '100%', justifyContent: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', border: tab === 'projects' ? '1px solid var(--teal)' : '1px solid rgba(255,255,255,0.08)', background: tab === 'projects' ? 'rgba(71,241,228,0.08)' : 'transparent', color: tab === 'projects' ? 'var(--teal)' : 'var(--muted)', textAlign: 'left', borderRadius: '4px', cursor: 'pointer' }}
          >
            <List size={18} />
            <span>Projetos</span>
          </button>
          
          <button 
            onClick={() => setTab('create-project')}
            className={`btn-s ${tab === 'create-project' ? 'on' : ''}`}
            style={{ width: '100%', justifyContent: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', border: tab === 'create-project' ? '1px solid var(--teal)' : '1px solid rgba(255,255,255,0.08)', background: tab === 'create-project' ? 'rgba(71,241,228,0.08)' : 'transparent', color: tab === 'create-project' ? 'var(--teal)' : 'var(--muted)', textAlign: 'left', borderRadius: '4px', cursor: 'pointer' }}
          >
            <FolderPlus size={18} />
            <span>Novo Projeto</span>
          </button>

          <button 
            onClick={() => setTab('create-broker')}
            className={`btn-s ${tab === 'create-broker' ? 'on' : ''}`}
            style={{ width: '100%', justifyContent: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', border: tab === 'create-broker' ? '1px solid var(--teal)' : '1px solid rgba(255,255,255,0.08)', background: tab === 'create-broker' ? 'rgba(71,241,228,0.08)' : 'transparent', color: tab === 'create-broker' ? 'var(--teal)' : 'var(--muted)', textAlign: 'left', borderRadius: '4px', cursor: 'pointer' }}
          >
            <UserPlus size={18} />
            <span>Novo Corretor</span>
          </button>
        </aside>

        {/* Conteúdo Principal */}
        <main style={{ background: 'rgba(27,27,32,0.4)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', padding: '24px' }}>
          
          {/* ABA 1: PROJETOS */}
          {tab === 'projects' && !selectedProject && (
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: '20px', textTransform: 'uppercase' }}>Projetos Ativos</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {projects.length === 0 ? (
                  <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Nenhum projeto cadastrado.</p>
                ) : (
                  projects.map(p => (
                    <div 
                      key={p.id} 
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-surface)', border: '1px solid rgba(255,255,255,0.04)', padding: '16px', borderRadius: '6px' }}
                    >
                      <div>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 900, color: 'var(--text)' }}>{p.title}</h3>
                        <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '4px' }}>
                          Corretor: {p.shift_profiles?.full_name || 'Desconhecido'} ({p.shift_profiles?.company_name || 'Individual'})
                        </p>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '0.7rem' }}>
                          <span style={{ color: 'var(--teal)' }}>Pacote Base: {p.base_pack.toUpperCase()}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {p.status === 'active' && <Clock size={12} className="text-yellow-500" />}
                            {p.status === 'completed' && <CheckCircle size={12} style={{ color: 'var(--teal)' }} />}
                            Status: {p.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={() => viewProjectDetails(p)}
                          className="btn-s"
                          style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          <Eye size={14} />
                          <span>Ver Detalhes</span>
                        </button>
                        <button 
                          onClick={() => deleteProject(p.id)}
                          className="btn-s"
                          style={{ padding: '6px', color: '#ff6b6b', borderColor: 'rgba(255,107,107,0.2)' }}
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* DETALHES DO PROJETO SELECIONADO */}
          {tab === 'projects' && selectedProject && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <button 
                  onClick={() => setSelectedProject(null)}
                  className="btn-s"
                  style={{ padding: '6px 12px' }}
                >
                  Voltar para lista
                </button>
                <button 
                  onClick={() => deleteProject(selectedProject.id)}
                  className="btn-p"
                  style={{ background: '#ff6b6b', color: '#fff', padding: '6px 12px' }}
                >
                  Deletar Projeto
                </button>
              </div>

              <h2 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '8px' }}>{selectedProject.title}</h2>
              <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '24px' }}>{selectedProject.description || 'Sem descrição.'}</p>

              {/* Informações e faturamento */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                <div style={{ background: 'var(--color-surface)', padding: '16px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700 }}>Corretor</span>
                  <p style={{ fontSize: '0.9rem', fontWeight: 900, marginTop: '4px' }}>{selectedProject.shift_profiles?.full_name}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{selectedProject.shift_profiles?.email}</p>
                </div>
                
                <div style={{ background: 'var(--color-surface)', padding: '16px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700 }}>Datas</span>
                  <p style={{ fontSize: '0.75rem', marginTop: '8px' }}>Criado: {new Date(selectedProject.created_at).toLocaleDateString()}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--teal)', marginTop: '4px' }}>
                    Expira em: {selectedProject.expires_at ? new Date(selectedProject.expires_at).toLocaleDateString() : 'Aguardando download'}
                  </p>
                </div>

                <div style={{ background: 'var(--color-surface)', padding: '16px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700 }}>Faturamento</span>
                  <p style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--teal)', marginTop: '4px' }}>
                    {selectedProject.final_price ? `${selectedProject.final_price}€` : 'Calculando...'}
                  </p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Pacote Inicial: {selectedProject.base_pack.toUpperCase()}</p>
                </div>
              </div>

              {/* Grid de Arquivos Selecionados pelo Corretor */}
              <h3 style={{ fontSize: '1rem', fontWeight: 900, marginBottom: '16px', textTransform: 'uppercase' }}>Miniaturas e Seleção</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px' }}>
                {selectedProjectFiles.map(file => (
                  <div 
                    key={file.id} 
                    style={{ 
                      position: 'relative', 
                      aspectRatio: '1', 
                      background: 'var(--color-surface-low)', 
                      borderRadius: '6px', 
                      overflow: 'hidden', 
                      border: file.selected ? '2px solid var(--teal)' : '1px solid rgba(255,255,255,0.08)' 
                    }}
                  >
                    {file.file_type === 'video' ? (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: 'var(--muted)' }}>
                        Vídeo MP4
                      </div>
                    ) : (
                      <img src={file.url_preview} alt={file.name} style={{ width: '100%', height: '100%', objectCover: 'cover' } as any} />
                    )}
                    
                    {/* Indicador de Selecionado */}
                    {file.selected && (
                      <div style={{ position: 'absolute', top: '6px', right: '6px', background: 'var(--teal)', color: '#000', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 'bold' }}>
                        ✓
                      </div>
                    )}

                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', padding: '4px', fontSize: '0.55rem', color: 'var(--muted)', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {file.file_type.toUpperCase()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ABA 2: CRIAR NOVO PROJETO */}
          {tab === 'create-project' && (
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: '20px', textTransform: 'uppercase' }}>Criar Novo Projeto</h2>

              {uploadMsg && (
                <div style={{ padding: '12px', background: 'rgba(71,241,228,0.08)', border: '1px solid var(--teal)', borderRadius: '4px', color: 'var(--teal)', fontSize: '0.8rem', marginBottom: '20px' }}>
                  {uploadMsg}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Título do Imóvel / Projeto</label>
                  <input 
                    type="text" 
                    value={projTitle} 
                    onChange={e => setProjTitle(e.target.value)}
                    placeholder="ex. Vivenda em Cascais - T4"
                    style={{ width: '100%', background: 'var(--color-surface-low)' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Descrição do Projeto</label>
                  <textarea 
                    value={projDesc} 
                    onChange={e => setProjDesc(e.target.value)}
                    placeholder="Descrição curta..."
                    style={{ width: '100%', background: 'var(--color-surface-low)' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Associar Corretor / Cliente</label>
                    <select 
                      value={selectedBrokerId} 
                      onChange={e => setSelectedBrokerId(e.target.value)}
                      style={{ width: '100%', background: 'var(--color-surface-low)' }}
                    >
                      <option value="">Selecione um corretor...</option>
                      {brokers.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.full_name} ({b.company_name || 'Individual'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Pacote Contratado</label>
                    <select 
                      value={basePack} 
                      onChange={e => setBasePack(e.target.value as any)}
                      style={{ width: '100%', background: 'var(--color-surface-low)' }}
                    >
                      <option value="pack1">PACK 1 (80€ - 20 Fotos, 2 IA)</option>
                      <option value="pack2">PACK 2 (100€ - 25 Fotos, 5 Drone, 5 IA)</option>
                      <option value="pack3">PACK 3 (230€ - 40 Fotos, 10 Drone, IA ilimitado)</option>
                    </select>
                  </div>
                </div>

                {/* Upload Section */}
                <div style={{ border: '2px dashed rgba(71,241,228,0.2)', padding: '32px 16px', borderRadius: '6px', textAlign: 'center', cursor: 'pointer', background: 'rgba(71,241,228,0.02)' }}>
                  <CloudArrowUp size={36} style={{ color: 'var(--teal)', margin: '0 auto 12px auto' }} />
                  <p style={{ fontSize: '0.8rem', fontWeight: 700 }}>Selecionar fotos e vídeos originais</p>
                  <p style={{ fontSize: '0.68rem', color: 'var(--muted)', marginTop: '4px' }}>Eles serão processados e marcados com água automaticamente para visualização.</p>
                  <input 
                    type="file" 
                    multiple 
                    onChange={handleFileChange} 
                    style={{ display: 'block', margin: '16px auto 0 auto', fontSize: '0.75rem' }} 
                  />
                </div>

                {/* Fila de uploads pendentes */}
                {uploadQueue.length > 0 && (
                  <div style={{ background: 'var(--color-surface-low)', padding: '16px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <h3 style={{ fontSize: '0.8rem', fontWeight: 900, marginBottom: '12px' }}>Fila de Mídias ({uploadQueue.length})</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {uploadQueue.map((item, index) => (
                        <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-surface)', padding: '8px 12px', borderRadius: '4px', fontSize: '0.75rem' }}>
                          <span style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.file.name}</span>
                          
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <select 
                              value={item.type} 
                              onChange={e => updateQueueItemType(index, e.target.value as any)}
                              style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                            >
                              <option value="photo">Foto Normal</option>
                              <option value="drone">Foto Drone</option>
                              <option value="ia">Foto IA</option>
                              <option value="video">Vídeo</option>
                            </select>

                            <span style={{ fontSize: '0.68rem', color: item.status === 'completed' ? 'var(--teal)' : item.status === 'failed' ? '#ff6b6b' : 'var(--muted)' }}>
                              {item.status.toUpperCase()}
                            </span>

                            <button 
                              onClick={() => removeQueueItem(index)}
                              style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer' }}
                            >
                              <Trash size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button 
                  onClick={handleCreateProject} 
                  disabled={isUploading}
                  className="btn-p"
                  style={{ width: '100%', marginTop: '12px', justifyContent: 'center', opacity: isUploading ? 0.6 : 1 }}
                >
                  {isUploading ? 'Criando Projeto...' : 'Salvar Projeto e Fazer Upload'}
                </button>
              </div>
            </div>
          )}

          {/* ABA 3: CADASTRAR NOVO CORRETOR */}
          {tab === 'create-broker' && (
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: '20px', textTransform: 'uppercase' }}>Cadastrar Novo Corretor</h2>

              {brokerMsg.text && (
                <div style={{ 
                  padding: '12px', 
                  background: brokerMsg.type === 'success' ? 'rgba(71,241,228,0.08)' : 'rgba(255,107,107,0.08)', 
                  border: brokerMsg.type === 'success' ? '1px solid var(--teal)' : '1px solid #ff6b6b', 
                  borderRadius: '4px', 
                  color: brokerMsg.type === 'success' ? 'var(--teal)' : '#ff6b6b', 
                  fontSize: '0.8rem', 
                  marginBottom: '20px' 
                }}>
                  {brokerMsg.text}
                </div>
              )}

              <form onSubmit={handleCreateBroker} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Nome Completo</label>
                  <input 
                    type="text" 
                    required 
                    value={brokerName} 
                    onChange={e => setBrokerName(e.target.value)}
                    placeholder="Nome do corretor"
                    style={{ width: '100%', background: 'var(--color-surface-low)' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Imobiliária / Empresa</label>
                  <input 
                    type="text" 
                    value={brokerCompany} 
                    onChange={e => setBrokerCompany(e.target.value)}
                    placeholder="Nome da imobiliária (ex. Remax)"
                    style={{ width: '100%', background: 'var(--color-surface-low)' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>E-mail</label>
                  <input 
                    type="email" 
                    required 
                    value={brokerEmail} 
                    onChange={e => setBrokerEmail(e.target.value)}
                    placeholder="email@corretor.com"
                    style={{ width: '100%', background: 'var(--color-surface-low)' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Palavra-passe Inicial</label>
                  <input 
                    type="password" 
                    required 
                    value={brokerPassword} 
                    onChange={e => setBrokerPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    style={{ width: '100%', background: 'var(--color-surface-low)' }}
                  />
                </div>

                <button 
                  type="submit" 
                  className="btn-p" 
                  style={{ width: '100%', marginTop: '12px', justifyContent: 'center' }}
                >
                  Cadastrar Corretor
                </button>
              </form>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
