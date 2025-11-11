import { Injectable } from '@angular/core';

export interface ChatTurn { user: string; ai: string; }
export interface RoleMsg { role: 'user' | 'assistant'; content: string; }

@Injectable({ providedIn: 'root' })
export class ChatService {
  async streamChat(
    history: ChatTurn[],
    userText: string,
    onDelta: (delta: string) => void
  ): Promise<void> {
    const historyTurns = history.slice(-10);
    const chatMessages: RoleMsg[] = [];
    for (const m of historyTurns) {
      if (m.user?.trim()) chatMessages.push({ role: 'user', content: m.user });
      if (m.ai?.trim()) chatMessages.push({ role: 'assistant', content: m.ai });
    }
    chatMessages.push({ role: 'user', content: userText });

    const resp = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: chatMessages }),
    });
    if (!resp.ok || !resp.body) throw new Error('Stream failed');

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let sep;
      while ((sep = buffer.indexOf('\n\n')) !== -1) {
        const chunk = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        const line = chunk.trim();
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (payload === '[DONE]') return;

        try {
          const delta = JSON.parse(payload);
          if (delta) onDelta(delta);
        } catch {
          if (payload) onDelta(payload);
        }
      }
    }
  }
}