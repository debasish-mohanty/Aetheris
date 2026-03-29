/**
 * Aetheris — Immersive AI Roleplay
 * A premium, private chat experience powered by local intelligence.
 */
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import api from '../api'
import SettingsPanel from './Settings'
import {
  SendIcon, PlusIcon, TrashIcon, EditIcon, XIcon,
  ChatIcon, SearchIcon, SettingsIcon, SparklesIcon,
  MessageSquareIcon, BookOpenIcon, CpuIcon, StopIcon, GitBranchIcon
} from '../icons'

// ── Avatar color variants ──
const AVATAR_VARIANTS = ['', 'v2', 'v3', 'v4'];
function getAvatarVariant(idx) {
  return AVATAR_VARIANTS[idx % AVATAR_VARIANTS.length];
}
function getInitials(name) {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ── CharacterModal Component ──
function CharacterModal({ character, onClose, onSave }) {
  const isEdit = !!character?.id;
  const [form, setForm] = useState({
    name: character?.name || '',
    description: character?.description || '',
    personality: character?.personality || '',
    scenario: character?.scenario || '',
    first_message: character?.first_message || '',
    example_dialogs: character?.example_dialogs || '',
    system_prompt: character?.system_prompt || '',
    tags: (character?.tags || []).join(', '),
    avatar_url: character?.avatar_url || '',
  });

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setForm(f => ({ ...f, avatar_url: ev.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    const data = {
      ...form,
      tags: form.tags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean),
    };
    onSave(data, character?.id);
  };

  const updateField = (key, val) => setForm(f => ({ ...f, [key]: val }));

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>{isEdit ? 'Edit Character' : 'Create Character'}</h2>
          <button className="btn-icon" onClick={onClose}><XIcon /></button>
        </div>
        <div className="modal-body">
          <div className="form-group" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div className={`char-avatar ${form.avatar_url ? '' : 'v2'}`}
                 style={{ width: '64px', height: '64px', fontSize: '24px', flexShrink: 0,
                          ...(form.avatar_url ? { backgroundImage: `url(${form.avatar_url})`, backgroundSize: 'cover' } : {}) }}>
              {form.avatar_url ? '' : getInitials(form.name || '?')}
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label">Avatar</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} id={`avatar-upload-${character?.id || 'new'}`} />
                <label htmlFor={`avatar-upload-${character?.id || 'new'}`} className="btn btn-ghost" style={{ cursor: 'pointer' }}>
                  Upload Image
                </label>
                <input className="form-input" value={form.avatar_url}
                  onChange={e => updateField('avatar_url', e.target.value)}
                  placeholder="Or paste image URL..." style={{ flex: 1 }} />
              </div>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Name <span className="required">*</span></label>
            <input className="form-input" value={form.name}
              onChange={e => updateField('name', e.target.value)}
              placeholder="Character name" autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" value={form.description}
              onChange={e => updateField('description', e.target.value)}
              placeholder="Physical appearance, background, etc."
              rows={3} />
            <p className="form-hint">Who is this character? Describe their appearance, backstory, and role.</p>
          </div>
          <div className="form-group">
            <label className="form-label">Personality</label>
            <textarea className="form-textarea" value={form.personality}
              onChange={e => updateField('personality', e.target.value)}
              placeholder="Traits, behaviors, speech patterns..."
              rows={3} />
          </div>
          <div className="form-group">
            <label className="form-label">Scenario</label>
            <textarea className="form-textarea" value={form.scenario}
              onChange={e => updateField('scenario', e.target.value)}
              placeholder="The setting and circumstances of the conversation..."
              rows={2} />
          </div>
          <div className="form-group">
            <label className="form-label">First Message (Greeting)</label>
            <textarea className="form-textarea" value={form.first_message}
              onChange={e => updateField('first_message', e.target.value)}
              placeholder="The character's opening message when a new chat starts. Use *asterisks* for actions."
              rows={4} />
            <p className="form-hint">This message will be sent automatically when a new chat is created.</p>
          </div>
          <div className="form-group">
            <label className="form-label">Example Dialogs</label>
            <textarea className="form-textarea" value={form.example_dialogs}
              onChange={e => updateField('example_dialogs', e.target.value)}
              placeholder="Example conversations to teach the AI this character's speech style..."
              rows={3} />
          </div>
          <div className="form-group">
            <label className="form-label">System Prompt Override</label>
            <textarea className="form-textarea" value={form.system_prompt}
              onChange={e => updateField('system_prompt', e.target.value)}
              placeholder="Custom system prompt (overrides default roleplay instructions)..."
              rows={2} />
          </div>
          <div className="form-group">
            <label className="form-label">Tags</label>
            <input className="form-input" value={form.tags}
              onChange={e => updateField('tags', e.target.value)}
              placeholder="Fantasy, Romance, Adventure (comma separated)" />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit}>
            {isEdit ? 'Save Changes' : 'Create Character'}
          </button>
        </div>
      </div>
    </div>
  );
}


// ── User Persona Modal ──
function PersonaModal({ persona, onClose, onSave }) {
  const isEdit = !!persona?.id;
  const [form, setForm] = useState({
    name: persona?.name || '',
    persona: persona?.persona || '',
    avatar_url: persona?.avatar_url || '',
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setForm(f => ({ ...f, avatar_url: ev.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    onSave(form, persona?.id);
  };

  const handleGenerate = async () => {
    if (!form.name || isGenerating) return;
    
    const initialBio = form.persona; // Capture current bio to expand
    setForm(prev => ({ ...prev, persona: '' })); // Clear box for streaming
    setIsGenerating(true);
    let fullText = '';
    
    try {
      await api.generatePersonaStream(
        form.name, 
        initialBio,
        (chunk) => {
          fullText += chunk;
          setForm(prev => ({ ...prev, persona: fullText }));
        },
        () => setIsGenerating(false),
        (err) => {
          setIsGenerating(false);
          alert(`Generation failed: ${err.message}`);
          setForm(prev => ({ ...prev, persona: initialBio })); // Restore on error
        }
      );
    } catch (err) {
      console.error('Streaming failed', err);
      setIsGenerating(false);
    }
  };

  const updateField = (key, val) => setForm(f => ({ ...f, [key]: val }));

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>{isEdit ? 'Edit Persona' : 'Create Persona'}</h2>
          <button className="btn-icon" onClick={onClose}><XIcon /></button>
        </div>
        <div className="modal-body">
          <div className="form-group" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div className={`char-avatar ${form.avatar_url ? '' : 'v2'}`}
                 style={{ width: '64px', height: '64px', fontSize: '24px', flexShrink: 0,
                          ...(form.avatar_url ? { backgroundImage: `url(${form.avatar_url})`, backgroundSize: 'cover' } : {}) }}>
              {form.avatar_url ? '' : getInitials(form.name || '?')}
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label">Avatar</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} id={`persona-avatar-upload-${persona?.id || 'new'}`} />
                <label htmlFor={`persona-avatar-upload-${persona?.id || 'new'}`} className="btn btn-ghost" style={{ cursor: 'pointer' }}>
                  Upload Image
                </label>
                <input className="form-input" value={form.avatar_url}
                  onChange={e => updateField('avatar_url', e.target.value)}
                  placeholder="Or paste image URL..." style={{ flex: 1 }} />
              </div>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Name <span className="required">*</span></label>
            <input className="form-input" value={form.name}
              onChange={e => updateField('name', e.target.value)}
              placeholder="Your display name" autoFocus />
          </div>
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Appearance & Personality</label>
              <button 
                className="btn btn-ghost btn-sm" 
                onClick={handleGenerate}
                disabled={!form.name || isGenerating}
                style={{ fontSize: '0.75rem', gap: '4px' }}
              >
                <SparklesIcon style={{ width: '12px', height: '12px' }} />
                {isGenerating ? 'Generating...' : 'AI Enhance'}
              </button>
            </div>
            <textarea className="form-textarea" value={form.persona}
              onChange={e => updateField('persona', e.target.value)}
              placeholder="Provide a name and a few keywords/sentences, then click 'AI Enhance' to expand your story."
              rows={6} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit}>
            {isEdit ? 'Save Changes' : 'Create Persona'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Home Page ──
export default function Home() {
  // ── State ──
  const [characters, setCharacters] = useState([]);
  const [selectedChar, setSelectedChar] = useState(null);
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCharModal, setShowCharModal] = useState(false);
  const [editingChar, setEditingChar] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editMessageContent, setEditMessageContent] = useState('');
  
  // Personas
  const [personas, setPersonas] = useState([]);
  const [activePersonaId, setActivePersonaId] = useState(() => localStorage.getItem('rpc_active_persona_id') || '');
  const [showPersonaModal, setShowPersonaModal] = useState(false);
  const [editingPersona, setEditingPersona] = useState(null);

  const fileInputRef = useRef(null);
  const [models, setModels] = useState([]);
  const [currentModel, setCurrentModel] = useState('');
  const [ollamaStatus, setOllamaStatus] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // ── Load data ──
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [chars, pList, health] = await Promise.all([
        api.getCharacters(),
        api.getPersonas(),
        api.healthCheck().catch(() => ({ 
          ollama_available: false, 
          available_models: [], 
          default_model: 'llama3' 
        })),
      ]);
      setCharacters(chars);
      setPersonas(pList);
      setOllamaStatus(health.ollama_available);
      setModels(health.available_models || []);
      setCurrentModel(health.default_model || 'llama3');
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Character selection ──
  const selectCharacter = async (char) => {
    setSelectedChar(char);
    setActiveChat(null);
    setMessages([]);
    try {
      const chatList = await api.getChats(char.id);
      setChats(chatList);
    } catch (err) {
      console.error('Failed to load chats:', err);
      setChats([]);
    }
  };

  // ── Chat management ──
  const createNewChat = async () => {
    if (!selectedChar) return;
    try {
      const chat = await api.createChat(selectedChar.id);
      setChats(prev => [chat, ...prev]);
      openChat(chat);
    } catch (err) {
      console.error('Failed to create chat:', err);
    }
  };

  const openChat = async (chat) => {
    try {
      const fullChat = await api.getChat(chat.id);
      setActiveChat(fullChat);
      setMessages(fullChat.messages || []);
    } catch (err) {
      console.error('Failed to open chat:', err);
    }
  };

  const deleteChat = async (chatId, e) => {
    e?.stopPropagation();
    try {
      await api.deleteChat(chatId);
      setChats(prev => prev.filter(c => c.id !== chatId));
      if (activeChat?.id === chatId) {
        setActiveChat(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to delete chat:', err);
    }
  };

  // ── Import Character ──
  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const char = await api.importCharacter(file);
      setCharacters(prev => [char, ...prev]);
      e.target.value = '';
    } catch (err) {
      alert(`Import failed: ${err.message}`);
    }
  };

  // ── Persona CRUD ──
  useEffect(() => {
    let active = personas.find(p => p.id === activePersonaId);
    if (!active && personas.length > 0) {
      active = personas[0];
      setActivePersonaId(active.id);
      localStorage.setItem('rpc_active_persona_id', active.id);
    }
    
    if (active) {
      localStorage.setItem('rpc_user_name', active.name);
      localStorage.setItem('rpc_user_persona', active.persona || '');
      localStorage.setItem('rpc_user_avatar', active.avatar_url || '');
    } else {
      localStorage.removeItem('rpc_user_name');
      localStorage.removeItem('rpc_user_persona');
      localStorage.removeItem('rpc_user_avatar');
    }
  }, [activePersonaId, personas]);

  const handleSavePersona = async (data, pId) => {
    try {
      let saved;
      if (pId) {
        saved = await api.updatePersona(pId, data);
        setPersonas(prev => prev.map(p => p.id === pId ? saved : p));
      } else {
        saved = await api.createPersona(data);
        setPersonas(prev => [saved, ...prev]);
        setActivePersonaId(saved.id);
      }
      setShowPersonaModal(false);
      setEditingPersona(null);
    } catch (err) {
      alert(`Failed to save persona: ${err.message}`);
    }
  };

  const handleDeletePersona = async (pId) => {
    if (!confirm('Delete this persona?')) return;
    try {
      await api.deletePersona(pId);
      setPersonas(prev => prev.filter(p => p.id !== pId));
      if (activePersonaId === pId) {
         setActivePersonaId('');
      }
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  // ── Send message ──
  const sendMessage = async () => {
    if (!inputText.trim() || !activeChat || isStreaming) return;

    const content = inputText.trim();
    setInputText('');
    setIsStreaming(true);
    setStreamingText('');

    // Optimistically add user message
    const userMsg = {
      id: 'temp-' + Date.now(),
      chat_id: activeChat.id,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);

    let fullText = '';

    await api.sendMessage(
      activeChat.id,
      content,
      // onChunk
      (chunk) => {
        fullText += chunk;
        setStreamingText(fullText);
      },
      // onDone
      () => {
        // Add complete assistant message
        const assistantMsg = {
          id: 'resp-' + Date.now(),
          chat_id: activeChat.id,
          role: 'assistant',
          content: fullText,
          created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, assistantMsg]);
        setStreamingText('');
        setIsStreaming(false);
        // Refresh chats list
        api.getChats(selectedChar.id).then(setChats).catch(() => {});
      },
      // onError
      (error) => {
        const errorMsg = {
          id: 'err-' + Date.now(),
          chat_id: activeChat.id,
          role: 'assistant',
          content: `*[Error: ${error.message}]*`,
          created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, errorMsg]);
        setStreamingText('');
        setIsStreaming(false);
      },
    );
  };

  // ── Impersonate User ──
  const handleImpersonate = async () => {
    if (!activeChat || isStreaming) return;
    setIsStreaming(true);
    setStreamingText('');

    let fullText = '';
    await api.impersonateUser(
      activeChat.id,
      (chunk) => {
        fullText += chunk;
        setStreamingText(fullText);
        setInputText(fullText);
      },
      () => {
        setIsStreaming(false);
        setStreamingText('');
      },
      (error) => {
        setIsStreaming(false);
        setStreamingText('');
        alert(`Impersonate failed: ${error.message}`);
      }
    );
  };

  // ── Message Edit & Delete ──
  const startEditMessage = (msg) => {
    setEditingMessageId(msg.id);
    setEditMessageContent(msg.content);
  };

  const saveEditMessage = async () => {
    if (!editingMessageId) return;
    try {
      const updated = await api.updateMessage(editingMessageId, editMessageContent);
      setMessages(prev => prev.map(m => m.id === editingMessageId ? updated : m));
      setEditingMessageId(null);
      setEditMessageContent('');
    } catch (err) {
      alert(`Edit failed: ${err.message}`);
    }
  };

  const deleteMessage = async (msgId) => {
    if (!confirm('Delete this message?')) return;
    try {
      await api.deleteMessage(msgId);
      setMessages(prev => prev.filter(m => m.id !== msgId));
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleBranchChat = async (msgId) => {
    if (!confirm('Duplicate chat branching from this message?')) return;
    try {
      const newChat = await api.branchChat(activeChat.id, msgId);
      setChats(prev => [newChat, ...prev]);
      openChat(newChat);
    } catch (err) {
      alert(`Branch failed: ${err.message}`);
    }
  };

  // ── Character CRUD ──
  const handleSaveCharacter = async (data, charId) => {
    try {
      if (charId) {
        const updated = await api.updateCharacter(charId, data);
        setCharacters(prev => prev.map(c => c.id === charId ? updated : c));
        if (selectedChar?.id === charId) {
          setSelectedChar(updated);
        }
      } else {
        const created = await api.createCharacter(data);
        setCharacters(prev => [created, ...prev]);
      }
      setShowCharModal(false);
      setEditingChar(null);
    } catch (err) {
      console.error('Failed to save character:', err);
    }
  };

  const handleDeleteCharacter = async (charId, e) => {
    e?.stopPropagation();
    if (!confirm('Delete this character and all their chats?')) return;
    try {
      await api.deleteCharacter(charId);
      setCharacters(prev => prev.filter(c => c.id !== charId));
      if (selectedChar?.id === charId) {
        setSelectedChar(null);
        setChats([]);
        setActiveChat(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to delete character:', err);
    }
  };

  // ── Model change ──
  const handleModelChange = async (model) => {
    setCurrentModel(model);
    try {
      await api.updateSettings({ default_model: model });
    } catch (err) {
      console.error('Failed to update model:', err);
    }
  };

  // ── Auto-scroll ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  // ── Key handler ──
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Filter characters ──
  const filteredChars = useMemo(() => {
    if (!searchQuery) return characters;
    const q = searchQuery.toLowerCase();
    return characters.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.tags || []).some(t => t.toLowerCase().includes(q))
    );
  }, [characters, searchQuery]);

  // ── Render ──
  return (
    <div className="app-layout">
      {/* ═══ SIDEBAR ═══ */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-container">
            <span className="logo-icon">✧</span>
            <h1>Aetheris</h1>
          </div>
          <span className="app-version">PRO</span>
        </div>

        {/* Personas Selector */}
        <div className="sidebar-section" style={{ padding: '8px 16px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-default)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
             <span style={{ fontSize: '0.8rem', color: 'var(--accent-300)', fontWeight: 'bold' }}>👤 Playing as:</span>
             <div style={{ display: 'flex', gap: '4px' }}>
               <button 
                 className="btn-icon tooltip" 
                 data-tooltip="Create New Persona" 
                 onClick={() => { setEditingPersona(null); setShowPersonaModal(true); }}
                 style={{ width: '24px', height: '24px', padding: 0 }}
               >
                 <PlusIcon style={{ width: '14px', height: '14px' }} />
               </button>
               {activePersonaId && (
                 <>
                   <button className="btn-icon tooltip" data-tooltip="Edit Persona" onClick={() => {
                     setEditingPersona(personas.find(p => p.id === activePersonaId));
                     setShowPersonaModal(true);
                   }} style={{ width: '24px', height: '24px', padding: 0 }}><EditIcon style={{ width: '14px', height: '14px' }} /></button>
                   <button className="btn-icon tooltip" data-tooltip="Delete Persona" onClick={() => handleDeletePersona(activePersonaId)} style={{ width: '24px', height: '24px', padding: 0 }}><TrashIcon style={{ width: '14px', height: '14px' }} /></button>
                 </>
               )}
             </div>
          </div>
          <select className="form-input" style={{ width: '100%', fontSize: '0.9rem', padding: '6px' }} value={activePersonaId} onChange={e => {
            setActivePersonaId(e.target.value);
            localStorage.setItem('rpc_active_persona_id', e.target.value);
          }}>
            <option value="" disabled>{personas.length > 0 ? 'Select a persona...' : 'No personas found'}</option>
            {personas.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {/* Search */}
        <div className="sidebar-section">
          <div className="search-wrapper">
            <SearchIcon />
            <input
              className="search-input"
              placeholder="Search characters..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Characters Management */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">Characters</div>
          <div className="character-actions">
            <button
              className="action-btn action-btn-primary"
              onClick={() => { setEditingChar(null); setShowCharModal(true); }}
            >
              <PlusIcon /> New
            </button>
            <button
              className="action-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              Upload
            </button>
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".png,.json" onChange={handleImport} />
          </div>

          <div className="discover-links">
            <span className="discover-label">Discover:</span>
            <a href="https://www.chub.ai/" target="_blank" rel="noopener noreferrer" className="discover-link">Chub</a>
            <span className="discover-sep">•</span>
            <a href="https://aicharactercards.com/" target="_blank" rel="noopener noreferrer" className="discover-link">CharacterCards</a>
            <span className="discover-sep">•</span>
            <a href="https://characterhub.org/" target="_blank" rel="noopener noreferrer" className="discover-link">CharacterHub</a>
          </div>
        </div>

        <div className="sidebar-list">
          {filteredChars.map((char, idx) => (
            <div
              key={char.id}
              className={`char-card ${selectedChar?.id === char.id ? 'active' : ''}`}
              onClick={() => selectCharacter(char)}
            >
              <div className={`char-avatar ${char.avatar_url ? '' : getAvatarVariant(idx)}`}
                   style={char.avatar_url ? { backgroundImage: `url(${char.avatar_url})`, backgroundSize: 'cover' } : {}}>
                {char.avatar_url ? '' : getInitials(char.name)}
              </div>
              <div className="char-info">
                <div className="char-name">{char.name}</div>
                <div className="char-tags">
                  {(char.tags || []).slice(0, 3).map(tag => (
                    <span key={tag} className="char-tag">{tag}</span>
                  ))}
                </div>
              </div>
              {char.message_count > 0 && (
                <span className="char-message-count">{char.message_count} msgs</span>
              )}
            </div>
          ))}
        </div>

        {/* Footer: Status & Model & Settings */}
        <div className="sidebar-footer">
          <div className={`status-bar ${ollamaStatus ? 'status-online' : 'status-offline'}`}>
            <span className="status-dot" />
            <span>{ollamaStatus ? 'Ollama Connected' : 'Ollama Offline'}</span>
          </div>
          {currentModel && (
            <div className="model-info-display" title="Active Model (Change in Settings)">
              <span className="model-label">Model:</span>
              <span className="model-name">{currentModel}</span>
            </div>
          )}
          <button
            className="settings-btn"
            onClick={() => setShowSettings(true)}
          >
            <SettingsIcon /> Settings
          </button>
        </div>
      </aside>

      {/* ═══ MAIN CONTENT ═══ */}
      <main className="main-content">
        {!selectedChar ? (
          /* ── Welcome Screen ── */
          <div className="welcome-screen">
            <div className="welcome-logo">
              <div className="pulsing-orb"></div>
              <SparklesIcon />
            </div>
            <h2>Step into the Nexus</h2>
            <p className="welcome-subtitle">
              Where imagination meets intelligence. Craft unique personas and explore 
              limitless worlds in a completely private, localized environment.
            </p>
            <div className="welcome-features">
              <div className="welcome-feature">
                <div className="welcome-feature-icon">🎭</div>
                <h4>Character Cards</h4>
                <p>Rich personality definitions with scenarios & greetings</p>
              </div>
              <div className="welcome-feature">
                <div className="welcome-feature-icon">⚡</div>
                <h4>Streaming Chat</h4>
                <p>Real-time AI responses with live text streaming</p>
              </div>
              <div className="welcome-feature">
                <div className="welcome-feature-icon">🔒</div>
                <h4>100% Local</h4>
                <p>Everything runs on your machine — fully private</p>
              </div>
            </div>
          </div>
        ) : !activeChat ? (
          /* ── Character Selected, No Chat ── */
          <>
            <div className="chat-header">
              <div className={`chat-header-avatar ${selectedChar.avatar_url ? 'has-bg' : getAvatarVariant(characters.indexOf(selectedChar))}`}
                style={selectedChar.avatar_url ? { backgroundImage: `url(${selectedChar.avatar_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: `linear-gradient(135deg, var(--accent-500), var(--accent-700))` }}>
                {selectedChar.avatar_url ? '' : getInitials(selectedChar.name)}
              </div>
              <div className="chat-header-info">
                <h2>{selectedChar.name}</h2>
                <p>{(selectedChar.tags || []).join(' • ') || 'No tags'}</p>
              </div>
              <div className="chat-header-actions">
                <button className="btn-icon tooltip" data-tooltip="Edit"
                  onClick={() => { setEditingChar(selectedChar); setShowCharModal(true); }}>
                  <EditIcon />
                </button>
                <button className="btn-icon tooltip" data-tooltip="Delete"
                  onClick={(e) => handleDeleteCharacter(selectedChar.id, e)}>
                  <TrashIcon />
                </button>
              </div>
            </div>

            <div className="empty-state">
              <div className="empty-state-icon">
                <MessageSquareIcon />
              </div>
              <h3>Start Chatting with {selectedChar.name}</h3>
              <p style={{ marginBottom: 20 }}>
                {selectedChar.description
                  ? selectedChar.description.slice(0, 150) + (selectedChar.description.length > 150 ? '...' : '')
                  : 'Create a new chat to begin your roleplay adventure!'}
              </p>
              <button className="btn btn-primary" onClick={createNewChat}>
                <PlusIcon /> New Chat
              </button>

              {chats.length > 0 && (
                <div style={{ marginTop: 32, width: '100%', maxWidth: 400 }}>
                  <div className="sidebar-section-title" style={{ textAlign: 'center', marginBottom: 12 }}>
                    Previous Chats
                  </div>
                  {chats.map(chat => (
                    <div
                      key={chat.id}
                      className="chat-list-item"
                      onClick={() => openChat(chat)}
                    >
                      <span style={{ width: 24, height: 24, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ChatIcon />
                      </span>
                      <div className="chat-title-wrapper" style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                        <span className="chat-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chat.title}</span>
                        <span className="chat-meta" style={{ fontSize: '0.75rem', color: 'var(--accent-400)' }}>
                          {new Date(chat.updated_at || chat.created_at).toLocaleString()}
                        </span>
                      </div>
                      <span className="chat-meta" style={{ whiteSpace: 'nowrap' }}>{chat.message_count} msgs</span>
                      <button
                        className="btn-icon delete-chat-btn"
                        onClick={(e) => deleteChat(chat.id, e)}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          /* ── Active Chat ── */
          <>
            <div className="chat-header">
              <div className={`chat-header-avatar ${selectedChar.avatar_url ? 'has-bg' : ''}`}
                style={selectedChar.avatar_url ? { backgroundImage: `url(${selectedChar.avatar_url})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' } : {}}>
                {selectedChar.avatar_url ? '' : getInitials(selectedChar.name)}
              </div>
              <div className="chat-header-info">
                <h2>{selectedChar.name}</h2>
                <p>
                  {isStreaming ? 'Typing...' : `${messages.length} messages`}
                  {currentModel && ` • ${currentModel}`}
                </p>
              </div>
              <div className="chat-header-actions">
                <button className="btn btn-primary btn-sm tooltip" data-tooltip="Create a new fresh chat"
                  onClick={createNewChat} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <PlusIcon style={{width:'14px',height:'14px'}} /> New Chat
                </button>
                <button className="btn btn-ghost btn-sm tooltip" data-tooltip="View past chats"
                  onClick={async () => {
                    setActiveChat(null);
                    setMessages([]);
                    if (selectedChar) {
                      try {
                        const chatList = await api.getChats(selectedChar.id);
                        setChats(chatList);
                      } catch (err) {
                        console.error('Failed to load chats:', err);
                      }
                    }
                  }} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <XIcon style={{width:'14px',height:'14px'}} /> Close
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="messages-area">
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                const userName = localStorage.getItem('rpc_user_name') || 'You';
                const userAvatar = localStorage.getItem('rpc_user_avatar') || '';
                
                return (
                <div key={msg.id} className={`message ${msg.role}`}>
                  <div className={`message-avatar ${(isUser && userAvatar) || (!isUser && selectedChar.avatar_url) ? 'has-bg' : ''}`}
                       style={isUser && userAvatar ? { backgroundImage: `url(${userAvatar})`, backgroundSize: 'cover' } : (!isUser && selectedChar.avatar_url ? { backgroundImage: `url(${selectedChar.avatar_url})`, backgroundSize: 'cover' } : {})}>
                    {isUser ? (!userAvatar && getInitials(userName)) : (!selectedChar.avatar_url && getInitials(selectedChar.name))}
                  </div>
                  <div className="message-body">
                    <div className="message-sender">
                      {isUser ? userName : selectedChar.name}
                      <div className="message-actions">
                        <button className="btn-icon tooltip" data-tooltip="Branch Chat" onClick={() => handleBranchChat(msg.id)}><GitBranchIcon /></button>
                        <button className="btn-icon tooltip" data-tooltip="Edit" onClick={() => startEditMessage(msg)}><EditIcon /></button>
                        <button className="btn-icon tooltip" data-tooltip="Delete" onClick={() => deleteMessage(msg.id)}><TrashIcon /></button>
                      </div>
                    </div>
                    <div className="message-content">
                      {editingMessageId === msg.id ? (
                        <div className="message-edit-mode">
                          <textarea
                            className="form-textarea"
                            value={editMessageContent}
                            onChange={e => setEditMessageContent(e.target.value)}
                            rows={4}
                            autoFocus
                          />
                          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                            <button className="btn btn-primary btn-sm" onClick={saveEditMessage}>Save</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => setEditingMessageId(null)}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

              {/* Streaming message */}
              {isStreaming && streamingText && (
                <div className="message assistant">
                  <div className="message-avatar">
                    {getInitials(selectedChar.name)}
                  </div>
                  <div className="message-body">
                    <div className="message-sender">{selectedChar.name}</div>
                    <div className="message-content">
                      <ReactMarkdown>{streamingText}</ReactMarkdown>
                      <span className="streaming-cursor" />
                    </div>
                  </div>
                </div>
              )}

              {/* Typing indicator */}
              {isStreaming && !streamingText && (
                <div className="typing-indicator">
                  <div className="message-avatar" style={{
                    width: 32, height: 32, borderRadius: 6,
                    background: 'linear-gradient(135deg, var(--accent-500), var(--accent-700))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, color: 'white',
                  }}>
                    {getInitials(selectedChar.name)}
                  </div>
                  <div className="typing-dots">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="input-area">
              <div className="input-container">
                <button
                  className="btn-icon ai-impersonate-btn"
                  onClick={handleImpersonate}
                  disabled={isStreaming}
                  title="Use AI to generate your response"
                >
                  <SparklesIcon />
                </button>
                <div className="input-wrapper">
                  <textarea
                    ref={inputRef}
                    className="message-input"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isStreaming && streamingText && activeChat ? "AI is generating your response..." : `Message ${selectedChar.name}...`}
                    rows={1}
                    disabled={isStreaming && !streamingText}
                  />
                </div>
                <button
                  className="send-button"
                  onClick={sendMessage}
                  disabled={!inputText.trim() || (isStreaming && !streamingText)}
                  title="Send message"
                >
                  {isStreaming ? <StopIcon /> : <SendIcon />}
                </button>
              </div>
              <p className="input-hint">
                Press Enter to send • Shift+Enter for new line
                {currentModel && <> • Model: <span className="model-name">{currentModel}</span></>}
              </p>
            </div>
          </>
        )}
      </main>

      {/* ═══ MODALS ═══ */}
      {showCharModal && (
        <CharacterModal
          character={editingChar}
          onClose={() => { setShowCharModal(false); setEditingChar(null); }}
          onSave={handleSaveCharacter}
        />
      )}

      {showPersonaModal && (
        <PersonaModal
          persona={editingPersona}
          onClose={() => { setShowPersonaModal(false); setEditingPersona(null); }}
          onSave={handleSavePersona}
        />
      )}

      {showSettings && (
        <SettingsPanel
          onClose={() => setShowSettings(false)}
          onSettingsChange={(updated) => {
            if (updated?.default_model) setCurrentModel(updated.default_model);
            if (updated?.available_models) setModels(updated.available_models);
            if (updated?.ollama_available !== undefined) setOllamaStatus(updated.ollama_available);
            loadInitialData();
          }}
        />
      )}
    </div>
  );
}
