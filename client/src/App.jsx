import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import './App.css'

function App() {
  const [messages, setMessages] = useState([])
  const [userMessage, setUserMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const submitMessage = async () => {
    const text = userMessage.trim()
    if (!text || isLoading) return

    // Optimistically append user message and show typing
    setMessages((prev) => [...prev, { user: text, ai: '' }])
    setIsLoading(true)

    try {
      const response = await axios.post(
        'http://localhost:3001/api/chat',
        { message: text }
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
        <div className="messages">
          {messages.map((message, index) => (
            <div key={index} className="message">
              <div className="bubble user">{message.user}</div>
              <div className={`bubble ai${isLoading && index === messages.length - 1 && !message.ai ? ' typing-bubble' : ''}`}>
                {message.ai ? (
                  message.ai
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
          <input
            type="text"
            value={userMessage}
            onChange={(event) => setUserMessage(event.target.value)}
            placeholder="Type your message..."
            className="input"
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
        <span>© 2025 Justin Bachorik</span>
      </footer>
    </>
  )
}

export default App
