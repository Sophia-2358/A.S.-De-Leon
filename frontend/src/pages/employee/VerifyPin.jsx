import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import EmployeeSidebar from '../../components/EmployeeSidebar'
import '../../styles/employee.css'
import '../../styles/pin.css'

export default function VerifyPin() {
    const [user, setUser]       = useState(null)
    const [pin, setPin]         = useState('')
    const [message, setMessage] = useState({ text: '', type: '' })
    const [busy, setBusy]       = useState(false)
    const cardRef               = useRef(null)
    const navigate              = useNavigate()

    useEffect(() => {
        async function checkSession() {
            try {
                const res  = await fetch('/api/auth/me', { credentials: 'include' })
                const data = await res.json().catch(() => ({}))
                if (!res.ok || !data.user || data.user.role !== 'employee') {
                    navigate('/login')
                    return
                }
                setUser(data.user)
            } catch {
                navigate('/login')
            }
        }
        checkSession()
    }, [navigate])

    function showError(text) {
        setMessage({ text, type: 'error' })
        const card = cardRef.current
        if (card) {
            card.classList.remove('shake')
            void card.offsetWidth
            card.classList.add('shake')
        }
    }

    async function handleSubmit(e) {
        e.preventDefault()

        if (!/^\d{4}$/.test(pin)) {
            showError('PIN must be exactly 4 digits.')
            return
        }

        setBusy(true)
        setMessage({ text: '', type: '' })

        try {
            const res  = await fetch('/api/employee/verify-pin', {
                method:      'POST',
                credentials: 'include',
                headers:     { 'Content-Type': 'application/json' },
                body:        JSON.stringify({ pin })
            })
            const data = await res.json().catch(() => ({}))

            if (!res.ok || !data.success) {
                if (data.needsSetup) {
                    navigate('/employee/set-pin')
                    return
                }
                showError(data.message || 'Incorrect PIN.')
                return
            }

            navigate('/employee/qr')

        } catch {
            showError('Cannot reach the server. Please check if the backend is running.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="layout-portal">
            <div className="portal">
                <EmployeeSidebar userName={user?.full_name} activePage="qr" />

                <main className="content">
                    <header className="page-head">
                        <h1>Enter your PIN</h1>
                        <p>Enter your 4-digit PIN to view your QR code</p>
                    </header>

                    <div className="pin-wrapper">
                        <div className="pin-card" ref={cardRef}>
                            {message.text && (
                                <p className={`alert show${message.type === 'success' ? ' success' : ''}`} role="alert">
                                    {message.text}
                                </p>
                            )}

                            <form onSubmit={handleSubmit} noValidate>
                                <div className="field">
                                    <label htmlFor="pin">4-digit PIN</label>
                                    <input
                                        id="pin"
                                        type="password"
                                        inputMode="numeric"
                                        maxLength={4}
                                        placeholder="••••"
                                        className="pin-input"
                                        value={pin}
                                        onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                                        autoFocus
                                    />
                                </div>

                                <button type="submit" disabled={busy}>
                                    {busy ? 'Verifying…' : 'Confirm'}
                                </button>
                            </form>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    )
}
