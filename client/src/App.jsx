import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'
import './App.css'

function App() {
  const [messages, setMessages] = useState([
    { user: '', ai: 'How can I help you today?' }
  ])
  const [userMessage, setUserMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesRef = useRef(null)

  const scrollToBottom = () => {
    const el = messagesRef.current
    if (!el) return
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight
    })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages.length, isLoading])

  const submitMessage = async () => {
    const text = userMessage.trim()
    if (!text || isLoading) return

    // Optimistically append user message and show typing
    setMessages((prev) => [...prev, { user: text, ai: '' }])
    scrollToBottom()
    setIsLoading(true)

    try {
      const historyTurns = messages.slice(-10)
      const chatMessages = historyTurns.flatMap((m) => {
        const arr = []
        if (m.user && m.user.trim()) arr.push({ role: 'user', content: m.user })
        if (m.ai && m.ai.trim()) arr.push({ role: 'assistant', content: m.ai })
        return arr
      })
      chatMessages.push({ role: 'user', content: text })
      const apiBase = import.meta.env.VITE_API_BASE_URL || window.location.origin
      const authHeader = import.meta.env.VITE_SERVER_API_KEY
        ? { Authorization: `Bearer ${import.meta.env.VITE_SERVER_API_KEY}` }
        : {}
      const resp = await fetch(`${apiBase}/api/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ messages: chatMessages }),
      })
      if (!resp.ok || !resp.body) throw new Error('Stream failed')

      const reader = resp.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        let sep
        while ((sep = buffer.indexOf('\n\n')) !== -1) {
          const chunk = buffer.slice(0, sep)
          buffer = buffer.slice(sep + 2)
          const line = chunk.trim()
          if (!line.startsWith('data:')) continue
          const payload = line.slice(5).trim()
          if (payload === '[DONE]') {
            break
          }
          let delta = ''
          try { delta = JSON.parse(payload) } catch { delta = payload }
          if (delta) {
            setMessages((prev) => {
              const next = [...prev]
              const lastIndex = next.length - 1
              if (lastIndex >= 0) next[lastIndex] = { ...next[lastIndex], ai: (next[lastIndex].ai || '') + delta }
              return next
            })
            scrollToBottom()
          }
        }
      }
      setUserMessage('')
      scrollToBottom()
    } catch (error) {
      console.error(error)
      // Show error in AI bubble, keep input for correction
      setMessages((prev) => {
        const next = [...prev]
        const lastIndex = next.length - 1
        if (lastIndex >= 0) next[lastIndex] = { ...next[lastIndex], ai: 'Sorry, something went wrong. Please try again.' }
        return next
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    submitMessage()
  }

  return (
    <>
      <header className="app-header">
        <h1 className="app-title">MessageGPT</h1>
      </header>
      <div className="chat">
        <div className="messages" ref={messagesRef}>
          {messages.map((message, index) => (
            <div key={index} className="message">
              {message.user ? (
                <div className="bubble user">{message.user}</div>
              ) : null}
              <div className={`bubble ai${isLoading && index === messages.length - 1 && !message.ai ? ' typing-bubble' : ''}`}>
                {message.ai ? (
                  <div className="md">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeSanitize]}
                    >
                      {message.ai}
                    </ReactMarkdown>
                  </div>
                ) : (
                  isLoading && index === messages.length - 1 ? (
                    <span className="typing" aria-label="Assistant is typing" aria-live="polite">
                      <span className="dot" />
                      <span className="dot" />
                      <span className="dot" />
                    </span>
                  ) : null
                )}
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="composer">
          <textarea
            value={userMessage}
            onChange={(event) => setUserMessage(event.target.value)}
            onKeyDown={(e) => {
              if (isLoading) return
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submitMessage()
              }
            }}
            placeholder="Type your message… Press Enter to send, Shift+Enter for newline"
            className="input textarea"
            rows={1}
            disabled={isLoading}
            aria-disabled={isLoading}
          />
          <button
            type="submit"
            className={`send${isLoading ? ' loading' : ''}`}
            disabled={isLoading || !userMessage.trim()}
          >
            {isLoading ? (<><span className="spinner" aria-hidden="true" /> Sending…</>) : 'Send'}
          </button>
        </form>
      </div>
      <footer className="app-footer">
        <span> 2025 Justin Bachorik</span>
      </footer>
    </>
  )
}

export default App
