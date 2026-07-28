import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export function Field({ label, htmlFor, children, hint, error, className }) {
  return (
    <div className={`space-y-1.5 ${className || ''}`}>
      {label && (
        <label htmlFor={htmlFor} className="block text-sm font-medium text-white/80">
          {label}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-white/40">{hint}</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

export default function Input(props) {
  return <input className="input-field" {...props} />
}

// Password input with a show/hide toggle. Drop-in replacement for <Input type="password" />.
export function PasswordInput({ id, value, onChange, placeholder = '••••••••', className, ...props }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`input-field pr-10 ${className || ''}`}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 transition hover:text-white/70"
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  )
}

export function Textarea(props) {
  return <textarea className="input-field min-h-[100px] resize-y" {...props} />
}

export function Select({ children, ...props }) {
  return (
    <select className="input-field" {...props}>
      {children}
    </select>
  )
}
