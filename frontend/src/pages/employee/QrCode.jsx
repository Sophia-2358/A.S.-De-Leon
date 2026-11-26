import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import EmployeeSidebar from '../../components/EmployeeSidebar'
import StatusBadge     from '../../components/StatusBadge'
import '../../styles/employee.css'

export default function QrCode() {
    const [user, setUser]   = useState(null)
    const [data, setData]   = useState(null)
    const [error, setError] = useState('')
    const qrBoxRef          = useRef(null)
    const navigate          = useNavigate()

    useEffect(() => {
        async function load() {
            try {
                const meRes  = await fetch('/api/auth/me', { credentials: 'include' })
                const meData = await meRes.json().catch(() => ({}))

                if (!meRes.ok || !meData.user || meData.user.role !== 'employee') {
                    navigate('/login')
                    return
                }

                setUser(meData.user)

                // Check PIN status first
                const pinRes  = await fetch('/api/employee/pin-status', { credentials: 'include' })
                const pinData = await pinRes.json().catch(() => ({}))

                if (!pinData.hasPin) {
                    navigate('/employee/set-pin')
                    return
                }

                if (!pinData.pinVerified) {
                    navigate('/employee/verify-pin')
                    return
                }

                const res  = await fetch('/api/employee/my-today', { credentials: 'include' })
                const json = await res.json().catch(() => ({}))

                if (!res.ok || !json.success) {
                    setError(json.message || 'Could not load your QR code.')
                    return
                }

                setData(json)

            } catch {
                setError('Cannot reach the server. Please check if the backend is running.')
            }
        }

        load()
    }, [navigate])

    useEffect(() => {
        if (!data || !qrBoxRef.current) return

        const empCode = data.employee?.employee_code
        const box     = qrBoxRef.current
        box.innerHTML = ''

        if (!empCode) {
            box.textContent = 'You have no ID code yet. Please ask the owner.'
            return
        }

        const script    = document.createElement('script')
        script.src      = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
        script.onload   = () => {
            box.innerHTML = ''
            new window.QRCode(box, {
                text:         empCode,
                width:        256,
                height:       256,
                correctLevel: window.QRCode.CorrectLevel.M
            })
        }
        script.onerror  = () => {
            box.textContent = 'The QR library could not load. Check your internet connection and refresh.'
        }
        document.body.appendChild(script)

        return () => {
            if (document.body.contains(script)) document.body.removeChild(script)
        }
    }, [data])

    const emp   = data?.employee || {}
    const today = data?.today    || {}

    return (
        <div className="layout-portal">
            <div className="portal">
            <EmployeeSidebar userName={user?.full_name} activePage="qr" />

            <main className="content">
                <header className="page-head">
                    <h1>My QR code</h1>
                    <p>Show this to the owner when you arrive and when you leave</p>
                </header>

                {error && <p className="alert show" role="alert">{error}</p>}

                {data && (
                    <div className="qr-layout">

                        {/* Top row: QR left, How it works right */}
                        <div className="qr-top-row">
                            <article className="panel qr-panel">
                                <header className="panel-head">
                                    <h2>Your attendance QR</h2>
                                    {emp.status !== 'active'
                                        ? <span className="badge badge-absent">Suspended</span>
                                        : <span className="badge badge-ok">Active</span>
                                    }
                                </header>

                                <div className="qr-box-large" ref={qrBoxRef}>Loading...</div>
                                <p className="qr-name">{emp.full_name}</p>
                                <p className="qr-meta">
                                    {[emp.position, emp.employee_code ? 'ID ' + emp.employee_code : null]
                                        .filter(Boolean).join(' · ')}
                                </p>
                                <p className="qr-note">This code is yours only. Do not share it with others.</p>
                            </article>

                            <article className="panel">
                                <h2>How it works</h2>
                                <ol className="steps">
                                    <li>
                                        <strong>Show your QR code</strong>
                                        <span>Open this page and show it to the owner.</span>
                                    </li>
                                    <li>
                                        <strong>Owner scans it</strong>
                                        <span>The owner scans the code with the camera.</span>
                                    </li>
                                    <li>
                                        <strong>It is recorded</strong>
                                        <span>The first scan of the day is time in, the next is time out.</span>
                                    </li>
                                    <li>
                                        <strong>Check your attendance</strong>
                                        <span>See your time in and time out in the Today section below.</span>
                                    </li>
                                </ol>
                            </article>
                        </div>

                        {/* Bottom: Today tiles */}
                        <article className="panel">
                            <header className="panel-head">
                                <h2>Today</h2>
                                <p className="today-date">{today.date_label}</p>
                            </header>

                            <div className="time-grid">
                                <section className="time-box">
                                    <h3>Time in</h3>
                                    <p className="time-value">{today.time_in || '—'}</p>
                                    <StatusBadge status={today.time_in ? today.status : 'pending'} />
                                </section>

                                <section className="time-box">
                                    <h3>Time out</h3>
                                    <p className="time-value">{today.time_out || '—'}</p>
                                    {today.time_out
                                        ? <span className="badge badge-ok">Recorded</span>
                                        : <StatusBadge status="pending" />
                                    }
                                </section>
                            </div>
                        </article>

                    </div>
                )}
            </main>
        </div>
        </div>
    )
}
