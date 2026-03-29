/**
 * API client for RoleplayChat backend
 */

const API_BASE = '/api';

class ApiClient {
  async request(path, options = {}) {
    const url = `${API_BASE}${path}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || `Request failed: ${response.status}`);
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  // Characters
  async getCharacters() {
    const data = await this.request('/characters');
    return data.characters || [];
  }

  async getCharacter(id) {
    return this.request(`/characters/${id}`);
  }

  async createCharacter(data) {
    return this.request('/characters', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCharacter(id, data) {
    return this.request(`/characters/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCharacter(id) {
    return this.request(`/characters/${id}`, { method: 'DELETE' });
  }

  async importCharacter(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_BASE}/characters/import`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Failed to import character');
    }
    
    return response.json();
  }

  // --- Personas ---
  async getPersonas() {
    const data = await this.request('/personas');
    return data.personas || [];
  }

  async createPersona(data) {
    return this.request('/personas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async updatePersona(id, data) {
    return this.request(`/personas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async deletePersona(id) {
    return this.request(`/personas/${id}`, { method: 'DELETE' });
  }

  async generatePersonaStream(name, bio, onChunk, onDone, onError) {
    try {
      const response = await fetch(`${API_BASE}/personas/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, bio }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'Failed to generate persona');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) onChunk(data.content);
              if (data.done) onDone?.();
            } catch (e) {
              // Ignore non-json lines
            }
          }
        }
      }
      if (onDone) onDone();
    } catch (err) {
      onError?.(err);
      throw err;
    }
  }

  // --- Chats ---
  async getChats(characterId) {
    const params = characterId ? `?character_id=${characterId}` : '';
    const data = await this.request(`/chats${params}`);
    return data.chats || [];
  }

  async getChat(id) {
    return this.request(`/chats/${id}`);
  }

  async createChat(characterId) {
    return this.request('/chats', {
      method: 'POST',
      body: JSON.stringify({ character_id: characterId }),
    });
  }

  async deleteChat(id) {
    return this.request(`/chats/${id}`, { method: 'DELETE' });
  }

  async branchChat(id, upToMsgId = '') {
    const query = upToMsgId ? `?up_to_msg_id=${upToMsgId}` : '';
    return this.request(`/chats/${id}/branch${query}`, { method: 'POST' });
  }

  // Messages (SSE streaming)
  async sendMessage(chatId, content, onChunk, onDone, onError) {
    try {
      const userName = localStorage.getItem('rpc_user_name') || 'You';
      const userPersona = localStorage.getItem('rpc_user_persona') || '';

      const response = await fetch(`${API_BASE}/chats/${chatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content,
          user_name: userName,
          user_persona: userPersona
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'Failed to send message');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.done) {
                onDone?.();
              } else if (data.content) {
                onChunk?.(data.content);
              }
            } catch {
              // Non-JSON SSE line, skip
            }
          }
        }
      }
    } catch (error) {
      onError?.(error);
    }
  }

  async impersonateUser(chatId, onChunk, onDone, onError) {
    try {
      const userName = localStorage.getItem('rpc_user_name') || 'You';
      const userPersona = localStorage.getItem('rpc_user_persona') || '';
      
      const response = await fetch(`${API_BASE}/chats/${chatId}/impersonate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_name: userName,
          user_persona: userPersona
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'Failed to impersonate');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.done) {
                onDone?.();
              } else if (data.content) {
                onChunk?.(data.content);
              }
            } catch {
              // ignore
            }
          }
        }
      }
    } catch (error) {
      onError?.(error);
    }
  }

  async updateMessage(id, content) {
    return this.request(`/messages/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
  }

  async deleteMessage(id) {
    return this.request(`/messages/${id}`, { method: 'DELETE' });
  }

  // Models & Settings
  async getModels() {
    const data = await this.request('/models');
    return data;
  }

  async getSettings() {
    return this.request('/settings');
  }

  async updateSettings(data) {
    return this.request('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async healthCheck() {
    const response = await fetch('/health');
    return response.json();
  }

  // Backup & Restore
  async exportData() {
    return this.request('/backup');
  }

  async importData(data) {
    return this.request('/restore', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async factoryReset() {
    return this.request('/factory-reset', { method: 'POST' });
  }
}

export const api = new ApiClient();
export default api;
