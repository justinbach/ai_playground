import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'
import './App.css'

function App() {
  const [messages, setMessages] = useState([])
  const [userMessage, setUserMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesRef = useRef(null)

  useEffect(() => {
    const el = messagesRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages.length, isLoading])

  const submitMessage = async () => {
    const text = userMessage.trim()
    if (!text || isLoading) return

    // Optimistically append user message and show typing
    setMessages((prev) => [...prev, { user: text, ai: '' }])
    setIsLoading(true)

    try {
      const historyTurns = messages.slice(-10)
      const chatMessages = historyTurns.flatMap((m) => {
        const arr = [{ role: 'user', content: m.user }]
        if (m.ai) arr.push({ role: 'assistant', content: m.ai })
        return arr
      })
      chatMessages.push({ role: 'user', content: text })

      const response = await axios.post(
        'http://localhost:3001/api/chat',
        { messages: chatMessages }
      )
      const reply = response.data.reply
      // Fill in AI reply for the last message
      setMessages((prev) => {
        const next = [...prev]
        const lastIndex = next.length - 1
        if (lastIndex >= 0) next[lastIndex] = { ...next[lastIndex], ai: reply }
        return next
      })
      setUserMessage('')
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
              <div className="bubble user">{message.user}</div>
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
