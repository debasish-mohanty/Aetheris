/**
 * SettingsPanel — Admin configuration page
 * Provides user control over Ollama connection, model selection,
 * chat behavior, and system-level settings.
 */
import React, { useState, useEffect } from 'react'
import api from '../api'
import { XIcon, RefreshIcon, CpuIcon } from '../icons'

export default function SettingsPanel({ onClose, onSettingsChange }) {
  const [settings, setSettings] = useState({
    ollama_url: 'http://localhost:11434',
    default_model: '',
    max_context_messages: 40,
    available_models: [],
    ollama_available: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [activeTab, setActiveTab] = useState('connection')

  // ── Local form state ──
  const [formModel, setFormModel] = useState('')
  const [formMaxContext, setFormMaxContext] = useState(40)
  const [formOllamaUrl, setFormOllamaUrl] = useState('http://localhost:11434')
  const [formUserName, setFormUserName] = useState(() => localStorage.getItem('rpc_user_name') || 'You')
  const [formTheme, setFormTheme] = useState(() => localStorage.getItem('rpc_theme') || 'dark')
  const [formFontSize, setFormFontSize] = useState(() => parseInt(localStorage.getItem('rpc_font_size') || '14'))
  const [formStreamSpeed, setFormStreamSpeed] = useState(() => localStorage.getItem('rpc_stream_speed') || 'normal')
  const [formAutoScroll, setFormAutoScroll] = useState(() => localStorage.getItem('rpc_auto_scroll') !== 'false')
  const [formShowTimestamps, setFormShowTimestamps] = useState(() => localStorage.getItem('rpc_timestamps') === 'true')
  const [formConfirmDelete, setFormConfirmDelete] = useState(() => localStorage.getItem('rpc_confirm_delete') !== 'false')
  const [formSystemPromptTemplate, setFormSystemPromptTemplate] = useState(
    () => localStorage.getItem('rpc_system_prompt_template') || ''
  )

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const data = await api.getSettings()
      setSettings(data)
      setFormModel(data.default_model || '')
      setFormMaxContext(data.max_context_messages || 40)
      setFormOllamaUrl(data.ollama_url || 'http://localhost:11434')
    } catch (err) {
      console.error('Failed to load settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveServerSettings = async () => {
    setSaving(true)
    try {
      const updated = await api.updateSettings({
        default_model: formModel,
        max_context_messages: formMaxContext,
      })
      setSettings(updated)
      onSettingsChange?.(updated)
      setTestResult({ type: 'success', message: 'Server settings saved!' })
      setTimeout(() => setTestResult(null), 3000)
    } catch (err) {
      setTestResult({ type: 'error', message: `Failed to save: ${err.message}` })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveUISettings = () => {
    localStorage.setItem('rpc_user_name', formUserName)
    localStorage.setItem('rpc_theme', formTheme)
    localStorage.setItem('rpc_font_size', String(formFontSize))
    localStorage.setItem('rpc_stream_speed', formStreamSpeed)
    localStorage.setItem('rpc_auto_scroll', String(formAutoScroll))
    localStorage.setItem('rpc_timestamps', String(formShowTimestamps))
    localStorage.setItem('rpc_confirm_delete', String(formConfirmDelete))
    localStorage.setItem('rpc_system_prompt_template', formSystemPromptTemplate)

    // Apply font size
    document.documentElement.style.setProperty('--msg-font-size', `${formFontSize}px`)

    onSettingsChange?.({ userName: formUserName })
    setTestResult({ type: 'success', message: 'UI preferences saved!' })
    setTimeout(() => setTestResult(null), 3000)
  }

  const testConnection = async () => {
    setTestResult({ type: 'info', message: 'Testing connection...' })
    try {
      const health = await api.healthCheck()
      if (health.ollama_available) {
        const modelCount = health.available_models?.length || 0
        setTestResult({
          type: 'success',
          message: `Connected! ${modelCount} model${modelCount !== 1 ? 's' : ''} available.`,
        })
        setSettings(prev => ({
          ...prev,
          ollama_available: true,
          available_models: health.available_models || [],
        }))
      } else {
        setTestResult({
          type: 'error',
          message: 'Ollama is not running. Start it with: ollama serve',
        })
      }
    } catch (err) {
      setTestResult({ type: 'error', message: `Connection failed: ${err.message}` })
    }
  }

  const refreshModels = async () => {
    try {
      const data = await api.getModels()
      setSettings(prev => ({ ...prev, available_models: data.models || [] }))
      setTestResult({ type: 'success', message: `Found ${data.models?.length || 0} models.` })
      setTimeout(() => setTestResult(null), 3000)
    } catch (err) {
      setTestResult({ type: 'error', message: 'Failed to refresh models' })
    }
  }

  const handleExportData = async () => {
    try {
      const data = await api.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `roleplay_chat_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setTestResult({ type: 'success', message: 'Backup downloaded successfully!' });
      setTimeout(() => setTestResult(null), 3000);
    } catch (err) {
      setTestResult({ type: 'error', message: `Export failed: ${err.message}` });
    }
  };

  const handleImportData = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!confirm('WARNING: Importing a backup will overwrite all current characters and chats. Continue?')) {
      e.target.value = ''; // Reset file input
      return;
    }
    
    setTestResult({ type: 'info', message: 'Restoring backup...' });
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target.result);
        await api.importData(json);
        setTestResult({ type: 'success', message: 'Backup restored! Reloading...' });
        setTimeout(() => window.location.reload(), 1500);
      } catch (err) {
        setTestResult({ type: 'error', message: `Import failed: ${err.message}` });
      }
    };
    reader.readAsText(file);
  };

  const handleFactoryReset = async () => {
    if (!confirm('DANGER: This will delete ALL characters, chats, and messages, and restore the default characters. This CANNOT be undone. Are you absolutely sure?')) {
      return;
    }
    
    setTestResult({ type: 'info', message: 'Performing factory reset...' });
    try {
      await api.factoryReset();
      setTestResult({ type: 'success', message: 'Factory reset complete! Reloading...' });
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setTestResult({ type: 'error', message: `Reset failed: ${err.message}` });
    }
  };

  const tabs = [
    { id: 'connection', label: 'Connection', icon: '🔌' },
    { id: 'chat', label: 'Chat & AI', icon: '🤖' },
    { id: 'interface', label: 'Interface', icon: '🎨' },
    { id: 'advanced', label: 'Advanced', icon: '⚙️' },
    { id: 'about', label: 'About', icon: 'ℹ️' },
  ]

  return (
    <div className="settings-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="settings-panel">
        {/* Header */}
        <div className="settings-header">
          <h2>⚙️ Settings</h2>
          <button className="btn-icon" onClick={onClose}><XIcon /></button>
        </div>

        {/* Tabs */}
        <div className="settings-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="settings-tab-icon">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="settings-content">
          {/* Status bar */}
          {testResult && (
            <div className={`settings-alert settings-alert-${testResult.type}`}>
              {testResult.type === 'success' && '✅ '}
              {testResult.type === 'error' && '❌ '}
              {testResult.type === 'info' && '⏳ '}
              {testResult.message}
            </div>
          )}

          {loading ? (
            <div className="settings-loading">Loading settings...</div>
          ) : (
            <>
              {/* ── Connection Tab ── */}
              {activeTab === 'connection' && (
                <div className="settings-section">
                  <h3>Ollama Connection</h3>
                  <p className="settings-desc">
                    Configure the connection to your local Ollama instance.
                    Ollama must be running for AI responses to work.
                  </p>

                  <div className="settings-status-card">
                    <div className="settings-status-indicator">
                      <span className={`status-dot-lg ${settings.ollama_available ? 'online' : 'offline'}`} />
                      <span className="settings-status-text">
                        {settings.ollama_available ? 'Ollama Connected' : 'Ollama Offline'}
                      </span>
                    </div>
                    <button className="btn btn-ghost" onClick={testConnection}>
                      <RefreshIcon /> Test Connection
                    </button>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Ollama API URL</label>
                    <input
                      className="form-input"
                      value={formOllamaUrl}
                      onChange={e => setFormOllamaUrl(e.target.value)}
                      placeholder="http://localhost:11434"
                    />
                    <p className="form-hint">
                      The URL is configured at server startup. To change it, restart using startup.bat / startup.sh.
                    </p>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Default Model</label>
                    <div className="settings-model-select">
                      <select
                        className="form-input"
                        value={formModel}
                        onChange={e => setFormModel(e.target.value)}
                      >
                        {formModel && !settings.available_models?.includes(formModel) && (
                          <option value={formModel}>{formModel} (configured)</option>
                        )}
                        {(settings.available_models || []).map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                        {(!settings.available_models || settings.available_models.length === 0) && !formModel && (
                          <option value="">No models found</option>
                        )}
                      </select>
                      <button className="btn btn-ghost btn-sm" onClick={refreshModels} title="Refresh model list">
                        <RefreshIcon />
                      </button>
                    </div>
                    <p className="form-hint">
                      Only shows models already installed in Ollama.
                      Install new models via terminal: <code>ollama pull modelname</code>
                    </p>
                  </div>

                  {settings.available_models?.length > 0 && (
                    <div className="settings-models-grid">
                      <label className="form-label">Available Models ({settings.available_models.length})</label>
                      <div className="model-chips">
                        {settings.available_models.map(m => (
                          <span
                            key={m}
                            className={`model-chip ${m === formModel ? 'active' : ''}`}
                            onClick={() => setFormModel(m)}
                          >
                            <CpuIcon /> {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="settings-actions">
                    <button
                      className="btn btn-primary"
                      onClick={handleSaveServerSettings}
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : 'Save Connection Settings'}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Chat & AI Tab ── */}
              {activeTab === 'chat' && (
                <div className="settings-section">
                  <h3>Chat & AI Behavior</h3>
                  <p className="settings-desc">
                    Control how the AI responds and how much conversation context it remembers.
                  </p>

                  <div className="form-group">
                    <label className="form-label">
                      Max Context Messages: <strong>{formMaxContext}</strong>
                    </label>
                    <input
                      type="range"
                      className="form-range"
                      min="4"
                      max="100"
                      step="2"
                      value={formMaxContext}
                      onChange={e => setFormMaxContext(parseInt(e.target.value))}
                    />
                    <div className="form-range-labels">
                      <span>4 (fast)</span>
                      <span>100 (more context)</span>
                    </div>
                    <p className="form-hint">
                      How many recent messages to include as context when generating AI responses.
                      Higher values give better memory but are slower and use more tokens.
                    </p>
                  </div>

                  <div className="form-group">
                    <label className="form-label">System Prompt Template</label>
                    <textarea
                      className="form-textarea"
                      value={formSystemPromptTemplate}
                      onChange={e => setFormSystemPromptTemplate(e.target.value)}
                      placeholder="Leave empty to use the default roleplay prompt. Use {{char}} for character name, {{personality}} for personality, {{scenario}} for scenario."
                      rows={5}
                    />
                    <p className="form-hint">
                      Override the default system prompt sent to the AI. Leave empty to use built-in roleplay formatting.
                      Available variables: {'{{char}}'}, {'{{personality}}'}, {'{{scenario}}'}, {'{{description}}'}
                    </p>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Streaming Speed</label>
                    <select
                      className="form-input"
                      value={formStreamSpeed}
                      onChange={e => setFormStreamSpeed(e.target.value)}
                    >
                      <option value="instant">Instant (show all at once)</option>
                      <option value="fast">Fast streaming</option>
                      <option value="normal">Normal streaming</option>
                      <option value="slow">Slow (typewriter effect)</option>
                    </select>
                    <p className="form-hint">Controls how AI responses are rendered. Stored locally.</p>
                  </div>

                  <div className="settings-actions">
                    <button className="btn btn-primary" onClick={() => {
                      handleSaveServerSettings()
                      handleSaveUISettings()
                    }} disabled={saving}>
                      {saving ? 'Saving...' : 'Save Chat Settings'}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Interface Tab ── */}
              {activeTab === 'interface' && (
                <div className="settings-section">
                  <h3>Interface Preferences</h3>
                  <p className="settings-desc">
                    Customize the UI appearance and behavior. These settings are stored in your browser.
                  </p>

                  <div className="form-group">
                    <label className="form-label">Your Display Name</label>
                    <input
                      className="form-input"
                      value={formUserName}
                      onChange={e => setFormUserName(e.target.value)}
                      placeholder="You"
                    />
                    <p className="form-hint">The name shown above your messages in chat.</p>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Message Font Size: {formFontSize}px</label>
                    <input
                      type="range"
                      className="form-range"
                      min="12"
                      max="20"
                      value={formFontSize}
                      onChange={e => setFormFontSize(parseInt(e.target.value))}
                    />
                    <div className="form-range-labels">
                      <span>12px (small)</span>
                      <span>20px (large)</span>
                    </div>
                  </div>

                  <div className="settings-toggles">
                    <label className="settings-toggle">
                      <input
                        type="checkbox"
                        checked={formAutoScroll}
                        onChange={e => setFormAutoScroll(e.target.checked)}
                      />
                      <span className="settings-toggle-slider" />
                      <span className="settings-toggle-label">Auto-scroll to new messages</span>
                    </label>

                    <label className="settings-toggle">
                      <input
                        type="checkbox"
                        checked={formShowTimestamps}
                        onChange={e => setFormShowTimestamps(e.target.checked)}
                      />
                      <span className="settings-toggle-slider" />
                      <span className="settings-toggle-label">Show message timestamps</span>
                    </label>

                    <label className="settings-toggle">
                      <input
                        type="checkbox"
                        checked={formConfirmDelete}
                        onChange={e => setFormConfirmDelete(e.target.checked)}
                      />
                      <span className="settings-toggle-slider" />
                      <span className="settings-toggle-label">Confirm before deleting chats/characters</span>
                    </label>
                  </div>

                  <div className="settings-actions">
                    <button className="btn btn-primary" onClick={handleSaveUISettings}>
                      Save Interface Settings
                    </button>
                  </div>
                </div>
              )}

              {/* ── Advanced Tab ── */}
              {activeTab === 'advanced' && (
                <div className="settings-section">
                  <h3>Advanced Configuration</h3>
                  <p className="settings-desc">
                    Server-side configuration and data management.
                  </p>

                  <div className="settings-info-grid">
                    <div className="settings-info-card">
                      <span className="settings-info-label">Backend URL</span>
                      <span className="settings-info-value">
                        {window.location.protocol}//{window.location.hostname}:
                        {settings.ollama_url ? '8000' : '8000'}
                      </span>
                    </div>
                    <div className="settings-info-card">
                      <span className="settings-info-label">Frontend URL</span>
                      <span className="settings-info-value">{window.location.origin}</span>
                    </div>
                    <div className="settings-info-card">
                      <span className="settings-info-label">Ollama URL</span>
                      <span className="settings-info-value">{settings.ollama_url}</span>
                    </div>
                    <div className="settings-info-card">
                      <span className="settings-info-label">Database</span>
                      <span className="settings-info-value">SQLite (local)</span>
                    </div>
                  </div>

                  <div className="form-group" style={{ marginTop: 24 }}>
                    <label className="form-label">Data Backup & Restore</label>
                    <p className="form-hint" style={{ marginBottom: 12 }}>
                      Download a complete JSON backup of all your characters and chats, or restore from a previous backup.
                    </p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button className="btn btn-primary" onClick={handleExportData}>
                        Export Backup (JSON)
                      </button>
                      <label className="btn btn-ghost" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        Import Backup
                        <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportData} />
                      </label>
                    </div>
                  </div>

                  <div className="form-group" style={{ marginTop: 24 }}>
                    <label className="form-label" style={{ color: 'var(--accent-400)' }}>Danger Zone</label>
                    <p className="form-hint" style={{ marginBottom: 12 }}>
                      These actions cannot be undone.
                    </p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button className="btn btn-danger" onClick={handleFactoryReset} style={{ background: 'var(--accent-600)' }}>
                        Factory Reset Database
                      </button>
                      <button className="btn btn-ghost" style={{ color: 'var(--accent-400)', borderColor: 'var(--accent-900)' }} onClick={() => {
                        if (confirm('Clear all UI preferences? This cannot be undone.')) {
                          localStorage.clear()
                          window.location.reload()
                        }
                      }}>
                        Reset UI Preferences
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── About Tab ── */}
              {activeTab === 'about' && (
                <div className="settings-section">
                  <h3>About Aetheris</h3>

                  <div className="settings-about">
                    <div className="settings-about-logo">✧</div>
                    <h4>Aetheris PRO</h4>
                    <p>An immersive AI roleplay ecosystem.</p>
                    <p className="settings-about-sub">Fully local. Fully private. Powered by intelligence.</p>
                  </div>

                  <div className="settings-about-stack">
                    <div className="stack-item">
                      <span className="stack-icon">⚛️</span>
                      <div>
                        <strong>Frontend</strong>
                        <p>React 18 + Vite</p>
                      </div>
                    </div>
                    <div className="stack-item">
                      <span className="stack-icon">🐍</span>
                      <div>
                        <strong>Backend</strong>
                        <p>FastAPI + Python</p>
                      </div>
                    </div>
                    <div className="stack-item">
                      <span className="stack-icon">🦙</span>
                      <div>
                        <strong>AI Engine</strong>
                        <p>Ollama (local LLM)</p>
                      </div>
                    </div>
                    <div className="stack-item">
                      <span className="stack-icon">🗄️</span>
                      <div>
                        <strong>Database</strong>
                        <p>SQLite</p>
                      </div>
                    </div>
                  </div>

                  <div className="settings-shortcuts">
                    <label className="form-label">Keyboard Shortcuts</label>
                    <div className="shortcut-list">
                      <div className="shortcut-item">
                        <kbd>Enter</kbd> <span>Send message</span>
                      </div>
                      <div className="shortcut-item">
                        <kbd>Shift</kbd>+<kbd>Enter</kbd> <span>New line</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
