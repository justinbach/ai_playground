import { Component, ElementRef, ViewChild, AfterViewChecked, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MarkdownModule } from 'ngx-markdown';
import { ChatService, ChatTurn } from './chat.service.js';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, MarkdownModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements AfterViewChecked {
  protected readonly title = signal('MessageGPT');

  messages: ChatTurn[] = [{ user: '', ai: 'How can I help you today?' }];
  userMessage = '';
  isLoading = false;
  private autoScroll = true;

  @ViewChild('messagesRef') messagesRef!: ElementRef<HTMLDivElement>;

  constructor(private chat: ChatService) {}

  ngAfterViewChecked(): void {
    if (this.autoScroll) this.scrollToBottom();
  }

  private scrollToBottom() {
    const el = this.messagesRef?.nativeElement;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }

  onMessagesScroll() {
    const el = this.messagesRef?.nativeElement;
    if (!el) return;
    const threshold = 48;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - threshold;
    this.autoScroll = atBottom;
  }

  async submitMessage() {
    const text = this.userMessage.trim();
    if (!text || this.isLoading) return;

    this.autoScroll = true;
    this.messages = [...this.messages, { user: text, ai: '' }];
    this.isLoading = true;

    try {
      await this.chat.streamChat(this.messages, text, (delta) => {
        const lastIndex = this.messages.length - 1;
        const last = this.messages[lastIndex];
        this.messages[lastIndex] = { ...last, ai: (last.ai || '') + delta };
      });
      this.userMessage = '';
    } catch {
      const lastIndex = this.messages.length - 1;
      const last = this.messages[lastIndex];
      this.messages[lastIndex] = { ...last, ai: 'Sorry, something went wrong. Please try again.' };
    } finally {
      this.isLoading = false;
    }
  }

  handleKeydown(e: KeyboardEvent) {
    if (this.isLoading) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.submitMessage();
    }
  }

  trackByIndex(i: number) { return i; }
}