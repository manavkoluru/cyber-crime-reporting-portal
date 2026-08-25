'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import Link from 'next/link'

// Icon components
const Shield = () => <span className="text-white">🛡️</span>
const Upload = () => <span>📤</span>
const Send = () => <span>📤</span>
const Mic = () => <span>🎤</span>
const MicOff = () => <span>🔇</span>
const X = () => <span>✕</span>
const FileText = () => <span>📄</span>

interface ChecklistItem {
  id: string
  label: string
  description: string
}

interface MessageMetadata {
  agent?: string
  priority?: string
  ccn?: string
  goldenHour?: boolean
  route?: string
  checklist?: ChecklistItem[]
  showChecklist?: boolean
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  fileAttached?: string
  metadata?: MessageMetadata
}

const QUICK_ACTIONS = [
  { label: '🚨 Report UPI Fraud', text: 'I was scammed via UPI and want to report it' },
  { label: '📋 Check Complaint Status', text: 'I want to check my complaint status' },
  { label: '🛒 E-commerce Scam', text: 'I was cheated in an online purchase' },
  { label: '📞 Call Helpline', text: 'How do I reach the cyber crime helpline?' },
]

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="bg-red-600 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
        <Shield className="w-4 h-4 text-white" />
      </div>
      <div className="bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex gap-1 items-center h-4">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
        </div>
      </div>
    </div>
  )
}

function formatContent(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : part.startsWith('*') && part.endsWith('*') ? (
      <span key={i}>{part.slice(1, -1)}</span>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}

function ChecklistCard({ items }: { items: ChecklistItem[] }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const readyCount = items.filter((i) => checked[i.id]).length
  const remaining = items.length - readyCount

  const toggle = (id: string) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="mt-2 bg-gray-900 border border-gray-700 rounded-xl p-3 not-italic">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-gray-200 uppercase tracking-wide">What you'll need</span>
        <span className={`text-xs font-semibold ${remaining === 0 ? 'text-green-400' : 'text-orange-400'}`}>
          {remaining === 0 ? 'All set ✓' : `${readyCount}/${items.length} ready`}
        </span>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-2">
            <button
              type="button"
              onClick={() => toggle(item.id)}
              aria-pressed={!!checked[item.id]}
              className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center text-[10px] cursor-pointer ${
                checked[item.id]
                  ? 'bg-green-600 border-green-600 text-white'
                  : 'border-gray-500 text-transparent hover:border-gray-300'
              }`}
            >
              ✓
            </button>
            <div className="cursor-pointer" onClick={() => toggle(item.id)}>
              <div className={`text-sm ${checked[item.id] ? 'text-gray-400 line-through' : 'text-gray-100'}`}>
                {item.label}
              </div>
              <div className="text-xs text-gray-500">{item.description}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  const displayContent = message.content.replace(/\[\[CHECKLIST:[A-Z_]+\]\]/, '').replace('[[CHECKLIST]]', '')

  return (
    <div className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="bg-red-600 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
          <Shield className="w-4 h-4 text-white" />
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-gray-800 text-gray-100 rounded-bl-sm'
        }`}
      >
        {formatContent(displayContent)}
        {message.metadata?.checklist && !isUser && (
          <ChecklistCard items={message.metadata.checklist} />
        )}
        {message.fileAttached && (
          <div className="flex items-center gap-2 mb-2 text-xs opacity-70 border-b border-white/10 pb-2">
            <FileText className="w-3 h-3" />
            {message.fileAttached}
          </div>
        )}
        {message.metadata?.goldenHour && !isUser && (
          <div className="flex items-center gap-2 max-w-[200px] space-y-2">
            {message.metadata.goldenHour && (
              <div className="flex items-center gap-2 bg-orange-600 rounded-xl px-3 py-2 text-white text-sm font-bold animate-pulse-slow">
                ⚡ GOLDEN HOUR ACTIVE – Funds may be recoverable!
              </div>
            )}
          </div>
        )}
        {message.metadata?.ccn && !isUser && (
          <div className="flex items-center gap-2 max-w-[200px] space-y-2">
            <div className="flex items-center gap-2 bg-green-800/80 border border-green-600 rounded-xl px-3 py-2 text-green-200 text-sm font-bold">
              ✅ Complaint Filed Successfully
              <div className="text-xs text-green-300 font-mono">{message.metadata.ccn}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ChatPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    // Check if user has valid session
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/me', { method: 'GET', credentials: 'include' })
        if (!res.ok) {
          // No valid session, redirect to login
          router.push('/login')
          return
        }
        setIsAuthenticated(true)
      } catch (error) {
        console.error('Session check failed:', error)
        router.push('/login')
      }
    }

    checkSession()
  }, [router])

  const [messages, setMessages] = useState<Message[]>([
    {
      id: uuidv4(),
      role: 'assistant',
      content: `🛡️ **Namaste! I'm here to help you fight back — right now.**

You can file your complaint in under 2 minutes. Let's get started.

Here is what I can do:
• 📸 Analyze your UPI/banking screenshot to extract transaction details automatically
• 📄 Read your PDF bank statement or payment receipt
• ⚡ File an emergency complaint if fraud happened in the last 2 hours (Golden Hour)
• ☑️ Track your complaint status with a reference number
• 🛒 Guide you for e-commerce or consumer disputes

**What happened? Tell me in your own words, or upload a screenshot to get started.**`,
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [isListening, setIsListening] = useState(false)

  // OTP verification modal state
  const [showOTPModal, setShowOTPModal] = useState(false)
  const [otpPhone, setOtpPhone] = useState('')
  const [otpInput, setOtpInput] = useState('')
  const [otpSending, setOtpSending] = useState(false)
  const [otpVerifying, setOtpVerifying] = useState(false)
  const [otpError, setOtpError] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [pendingMessageAfterOTP, setPendingMessageAfterOTP] = useState<Message | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const recognitionRef = useRef<any>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  const handleScroll = () => {
    const el = scrollContainerRef.current
    if (el) {
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100
      setShowScrollButton(!nearBottom)
    }
  }

  const handleSend = async () => {
    if (!input.trim() && !uploadedFile) return

    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: input.trim() || 'I have uploaded a file for analysis.',
      timestamp: new Date(),
      fileAttached: uploadedFile?.name,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setUploadedFile(null)
    setIsLoading(true)

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    try {
      const formData = new FormData()
      formData.append('message', userMessage.content)
      formData.append('sessionId', uuidv4())
      formData.append('history', JSON.stringify(messages.slice(-8).map((m) => ({ role: m.role, content: m.content }))))
      if (uploadedFile) {
        formData.append('file', uploadedFile)
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      if (!response.ok) throw new Error('API error')

      const data = await response.json()

      let messageContent = data.message
      if (typeof messageContent === 'string' && messageContent.startsWith('{')) {
        try {
          const parsed = JSON.parse(messageContent)
          messageContent = parsed.message || messageContent
        } catch {
          // Not JSON, use as-is
        }
      }

      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: String(messageContent),
        timestamp: new Date(),
        metadata: data.metadata,
      }

      // Check if OTP verification is required
      if (data.metadata?.requiresOTP && data.metadata?.otpPhone) {
        setOtpPhone(data.metadata.otpPhone)
        setPendingMessageAfterOTP(assistantMessage)
        setShowOTPModal(true)
        setIsLoading(false)
        // Don't add message yet - wait for OTP verification
        return
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error:', error)
      setMessages((prev) => [
        ...prev,
        {
          id: uuidv4(),
          role: 'assistant',
          content: 'I apologize – something went wrong on my end. Please try again, or call **1930** (National Cyber Helpline, available 24x7 and free).',
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendOTP = async () => {
    setOtpSending(true)
    setOtpError('')
    console.log('[OTP Send] Starting...')

    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: otpPhone }),
      })

      const data = await res.json()
      console.log('[OTP Send] Response:', data, 'Status:', res.status)

      if (!res.ok) {
        console.log('[OTP Send] Error:', data.error)
        setOtpError(data.error || 'Failed to send OTP')
        setOtpSending(false)
        return
      }

      console.log('[OTP Send] Success! Setting otpSent to true')
      setOtpSending(false)
      setOtpSent(true)
    } catch (err) {
      console.error('[OTP Send] Catch error:', err)
      setOtpError('Network error. Please try again.')
      setOtpSending(false)
    }
  }

  const handleVerifyOTP = async () => {
    if (otpInput.length < 4 || otpInput.length > 6) {
      setOtpError('Please enter a valid OTP (4-6 digits)')
      return
    }

    console.log('[OTP Verify] Starting verification with OTP:', otpInput)
    setOtpVerifying(true)
    setOtpError('')

    try {
      const res = await fetch('/api/chat/otp-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: otpPhone, otp: otpInput }),
        credentials: 'include',
      })

      const data = await res.json()
      console.log('[OTP Verify] Response:', data)

      if (!res.ok) {
        console.log('[OTP Verify] Failed:', data.error)
        setOtpVerifying(false)
        setOtpError(data.error || 'Invalid OTP')
        return
      }

      console.log('[OTP Verify] Success! Closing modal and showing dashboard redirect')
      // OTP verified successfully
      setOtpVerifying(false)
      setShowOTPModal(false)
      setOtpSent(false)
      setOtpInput('')
      setOtpError('')

      // Add the pending message to chat
      if (pendingMessageAfterOTP) {
        setMessages((prev) => [...prev, pendingMessageAfterOTP])
        setPendingMessageAfterOTP(null)
      }

      // Show success message and redirect to dashboard
      const verifiedPhone = otpPhone
      setMessages((prev) => [
        ...prev,
        {
          id: uuidv4(),
          role: 'assistant',
          content: `✅ **Verification successful!**

Your phone number (+91${verifiedPhone}) has been verified. Redirecting to dashboard...`,
          timestamp: new Date(),
        },
      ])

      setOtpPhone('')

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 1500)
    } catch (err) {
      console.error('[OTP Verify] Error:', err)
      setOtpVerifying(false)
      setOtpError('Network error. Please try again.')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileSelect = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      alert('File too large. Please upload files under 10MB.')
      return
    }
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      alert('Please upload an image (PNG, JPG) or PDF file.')
      return
    }
    setUploadedFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
  }

  const initializeVoiceRecognition = () => {
    if (typeof window === 'undefined') return
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Voice input not supported in your browser.')
      return
    }
    return new SpeechRecognition()
  }

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back()
    } else {
      window.location.href = '/dashboard'
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
      router.push('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const handleVoiceInput = () => {
    if (!recognitionRef.current) {
      recognitionRef.current = initializeVoiceRecognition()
      if (!recognitionRef.current) return
    }

    const recognition = recognitionRef.current

    if (isListening) {
      recognition.stop()
      setIsListening(false)
      return
    }

    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-IN'

    recognition.onstart = () => setIsListening(true)
    recognition.onresult = (event: any) => {
      let transcript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      setInput(transcript)
    }
    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)

    recognition.start()
  }

  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-500 hover:text-gray-800"
            title="Go back"
          >
            ← Back
          </button>
          <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition">
            <div className="bg-[#0b3d91] p-2 rounded-xl">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-gray-800 font-bold text-base">National Cyber Crime Reporting Portal</h1>
              <p className="text-gray-500 text-xs">Instant Fraud Response, 24/7</p>
            </div>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <a href="tel:1930" className="flex items-center gap-2 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-full px-3 py-1.5 transition-colors">
            <span className="text-orange-700 text-xs font-semibold">📞 1930</span>
          </a>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-full px-3 py-1.5 transition-colors"
          >
            <span className="text-gray-700 text-xs font-semibold">Logout</span>
          </button>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 space-y-4 relative">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {isLoading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {messages.length === 1 && (
        <div className="px-4 pb-2 flex gap-2 flex-wrap">
          {QUICK_ACTIONS.map((action) => (
            <button key={action.label} onClick={() => setInput(action.text)} className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 rounded-full px-3 py-1.5 transition-colors">
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* File Preview */}
      {uploadedFile && (
        <div className="px-4 pt-2 flex-shrink-0">
          <div className="inline-flex items-center gap-2 bg-blue-900/40 border border-blue-700/50 rounded-xl px-3 py-2 text-sm text-blue-200">
            <FileText className="w-3 h-3" />
            <span className="max-w-[200px] truncate">{uploadedFile.name}</span>
            <button onClick={() => setUploadedFile(null)} className="text-blue-400 hover:text-white ml-1">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="bg-gray-900 border-t border-gray-800 p-4 flex-shrink-0" onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop}>
        <div className="bg-gray-900 border border-gray-800 p-4 flex-shrink-0">
          <div className="flex gap-2 items-end">
            <input type="file" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])} accept="image/*,.pdf" className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white p-3 rounded-xl transition-colors flex-shrink-0" title="Upload screenshot or PDF">
              <Upload className="w-5 h-5" />
            </button>
            <button onClick={handleVoiceInput} className={`p-3 rounded-xl transition-colors flex-shrink-0 ${isListening ? 'bg-red-600 text-white animate-pulse' : 'bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white'}`} title={isListening ? 'Stop listening' : 'Start voice input'}>
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <textarea ref={textareaRef} value={input} onChange={handleTextareaChange} onKeyDown={handleKeyDown} placeholder="Tell me what happened, or upload a screenshot..." className="flex-1 bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-600 min-h-[48px] max-h-[120px]" />
            <button onClick={handleSend} disabled={isLoading || (!input.trim() && !uploadedFile)} className="bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-colors flex-shrink-0">
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-center text-gray-600 text-xs mt-2">
            🔒 Encrypted & Confidential • Emergency: <strong className="text-gray-500">📞 1930</strong> • Mental Support: <strong className="text-gray-500">iCall 9152987821</strong>
          </p>
        </div>
      </div>

      {/* OTP Verification Modal */}
      {showOTPModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-xl font-bold text-white mb-2">Verify Your Number</h3>
            <p className="text-gray-400 text-sm mb-4">
              {otpSent ? `Enter the OTP sent to +91-${otpPhone.slice(0, 5)}****` : 'Phone number verification'}
            </p>

            {otpError && (
              <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3 text-sm text-red-200 mb-4">
                {otpError}
              </div>
            )}

            {!otpSent ? (
              <>
                <p className="text-gray-300 text-sm mb-4">
                  We'll send a 4-6 digit code to your phone number.
                </p>
                <div className="mb-4">
                  <label className="block text-gray-300 text-sm mb-2">Phone Number</label>
                  <div className="flex gap-2">
                    <span className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 flex items-center">
                      +91
                    </span>
                    <input
                      type="tel"
                      value={otpPhone}
                      onChange={(e) => setOtpPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="Enter 10-digit number"
                      maxLength={10}
                      className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600"
                    />
                  </div>
                </div>
                <button
                  onClick={handleSendOTP}
                  disabled={otpSending || otpPhone.length !== 10}
                  className={`w-full font-semibold py-2 rounded-lg transition mb-3 text-white ${
                    otpSending || otpPhone.length !== 10
                      ? 'bg-gray-600 opacity-50 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {otpSending ? 'Sending...' : 'Send OTP'}
                </button>
              </>
            ) : (
              <>
                <input
                  type="text"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 4-6 digit OTP"
                  maxLength={6}
                  className={`w-full bg-gray-800 border rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600 text-center font-mono text-lg tracking-widest mb-3 ${
                    otpVerifying ? 'opacity-50 cursor-not-allowed' : 'border-gray-700'
                  }`}
                  disabled={otpVerifying}
                />
                <button
                  onClick={handleVerifyOTP}
                  disabled={otpVerifying || otpInput.length < 4}
                  className={`w-full font-semibold py-2 rounded-lg transition mb-3 text-white ${
                    otpVerifying || otpInput.length < 4
                      ? 'bg-gray-600 opacity-50 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {otpVerifying ? 'Verifying...' : 'Verify OTP'}
                </button>
                <button
                  onClick={() => {
                    setOtpSent(false)
                    setOtpInput('')
                    setOtpError('')
                  }}
                  disabled={otpVerifying}
                  className="w-full text-gray-400 hover:text-white text-sm font-medium transition disabled:opacity-50"
                >
                  ← Back to Phone Number
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
