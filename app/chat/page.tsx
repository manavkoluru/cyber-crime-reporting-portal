'use client'

import { useState, useRef, useEffect } from 'react'
import { formatTimeAgo } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import Link from 'next/link'

// Icon components
type IconProps = { className?: string }
const Shield = ({ className }: IconProps) => <span className={className || 'text-white'}>🛡️</span>
const Upload = ({ className }: IconProps) => <span className={className}>📤</span>
const Send = ({ className }: IconProps) => <span className={className}>📤</span>
const Mic = ({ className }: IconProps) => <span className={className}>🎤</span>
const MicOff = ({ className }: IconProps) => <span className={className}>🔇</span>
const X = ({ className }: IconProps) => <span className={className}>✕</span>
const FileText = ({ className }: IconProps) => <span className={className}>📄</span>

interface MessageMetadata {
  agent?: string
  priority?: string
  ccn?: string
  trackComplaint?: boolean
  goldenHour?: boolean
  route?: string
  extraction?: {
    items: Array<{ label: string; value: string | null }>
    remaining: string[]
  }
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

function ExtractionChecklist({ extraction }: { extraction: NonNullable<MessageMetadata['extraction']> }) {
  return (
    <section className="mt-3 rounded-xl border border-slate-600 bg-slate-900/80 p-3 not-italic" aria-label="Extracted transaction details">
      <h3 className="text-xs font-bold uppercase tracking-wide text-slate-200">Transaction details found</h3>
      <ul className="mt-2 space-y-2">
        {extraction.items.map((item) => (
          <li key={item.label} className="flex gap-2 text-sm">
            <span aria-hidden="true" className={item.value ? 'text-emerald-400' : 'text-amber-400'}>{item.value ? '✓' : '•'}</span>
            <span className="min-w-0">
              <span className="text-slate-400">{item.label}: </span>
              <span className={item.value ? 'font-medium text-white' : 'text-amber-200'}>{item.value || 'Still needed'}</span>
            </span>
          </li>
        ))}
      </ul>
      {extraction.remaining.length > 0 && (
        <p className="mt-3 border-t border-slate-700 pt-2 text-xs text-amber-100">
          Please provide: {extraction.remaining.join(', ')}.
        </p>
      )}
    </section>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'

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
        {formatContent(message.content)}
        {message.metadata?.extraction && !isUser && <ExtractionChecklist extraction={message.metadata.extraction} />}
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
        {message.metadata?.trackComplaint && !isUser && (
          <Link
            href="/track-complaint"
            className="mt-3 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            🔍 Track complaint status
          </Link>
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

**Upload a transaction screenshot or payment document and I will read it immediately.** If you prefer, type these details: transaction ID/UTR, amount lost, recipient UPI ID, mobile number or bank account, and payment method (UPI, IMPS, RTGS, NEFT, debit card, or credit card).`,
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')

  // Confirmation Modal
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [pendingFileData, setPendingFileData] = useState<any>(null)

  const handleConfirmation = (confirmed: boolean) => {
    if (confirmed && pendingFileData) {
      setMessages([...messages, { ...pendingFileData }])
    }
    setShowConfirmation(false)
    setPendingFileData(null)
  }
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

      const data = await response.json()

      if (!response.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: uuidv4(),
            role: 'assistant',
            content: String(data.message || 'I could not analyze the upload. Please try again or call 1930 for urgent fraud.'),
            timestamp: new Date(),
          },
        ])
        return
      }

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

Your phone number (+91${verifiedPhone}) has been verified. Redirecting to home...`,
          timestamp: new Date(),
        },
      ])

      setOtpPhone('')

      // Redirect to home after a short delay
      setTimeout(() => {
        window.location.href = '/'
      }, 1500)
    } catch (err) {
      console.error('[OTP Verify] Error:', err)
      setOtpVerifying(false)
      setOtpError('Network error. Please try again.')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends; Shift+Enter inserts a newline. Ignore Enter while an IME
    // composition is in progress so it doesn't send a half-typed word.
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
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
    // After the native file picker closes, browsers restore focus to the file
    // input / attach button, so pressing Enter would re-open the picker. Move
    // focus to the textarea (after the restoration tick) so Enter sends instead.
    setTimeout(() => {
      ;(document.activeElement as HTMLElement | null)?.blur?.()
      textareaRef.current?.focus()
    }, 0)
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
      window.location.href = '/'
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
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition">
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
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                const picked = e.target.files?.[0]
                // Reset so selecting the same file again still fires onChange,
                // and blur the input so it can't be re-triggered by Enter.
                e.target.value = ''
                e.target.blur()
                if (picked) handleFileSelect(picked)
              }}
              accept="image/*,.pdf"
              className="hidden"
            />
            <button
              type="button"
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              onKeyDown={(e) => {
                // Clickable only: never let keyboard (Enter/Space) open the picker.
                if (e.key === 'Enter' || e.key === ' ') e.preventDefault()
              }}
              onClick={() => fileInputRef.current?.click()}
              className="bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white p-3 rounded-xl transition-colors flex-shrink-0"
              title="Upload screenshot or PDF"
            >
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

function ConfirmationModal({ isOpen, onConfirm, onCancel }: { isOpen: boolean; onConfirm: () => void; onCancel: () => void }) {
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
        <div className="mb-4">
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <span className="text-2xl">✅</span> Ready to File?
          </h3>
          <p className="text-gray-600 text-sm mt-2">
            All required information has been collected. Should I proceed with filing your complaint?
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 bg-[#0b3d91] hover:bg-[#0a3480] text-white font-semibold rounded transition"
          >
            Yes, File
          </button>
        </div>
      </div>
    </div>
  )
}
