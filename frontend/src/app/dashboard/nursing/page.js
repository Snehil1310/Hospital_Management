'use client';
import { useState, useEffect } from 'react';
import api from '../../../lib/api';

function Modal({ open, onClose, title, children }) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-dark-700"><h3 className="text-lg font-semibold text-gray-800 dark:text-white">{title}</h3><button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button></div>
                <div className="p-5">{children}</div>
            </div>
        </div>
    );
}

// Shift time presets for each shift type
const SHIFT_TIMES = { morning: { start: '06:00', end: '14:00' }, afternoon: { start: '14:00', end: '22:00' }, night: { start: '22:00', end: '06:00' } };

export default function NursingPage() {
    const [shifts, setShifts] = useState([]);
    const [leaves, setLeaves] = useState([]);
    const [tab, setTab] = useState('shifts');
    const [showShift, setShowShift] = useState(false);
    const [showLeave, setShowLeave] = useState(false);
    const [nurses, setNurses] = useState([]);
    // Backend Shift model requires: nurse (ref), date, shiftType (enum), startTime (required), endTime (required), ward (required)
    const [shiftForm, setShiftForm] = useState({ nurse: '', date: '', shiftType: 'morning', startTime: '06:00', endTime: '14:00', ward: 'General' });
    // Backend LeaveRequest model requires: nurse (ref, required), startDate, endDate, type (required enum: sick/casual/earned/emergency), reason (required)
    const [leaveForm, setLeaveForm] = useState({ nurse: '', startDate: '', endDate: '', type: 'casual', reason: '' });
    const [msg, setMsg] = useState('');

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        const [s, l, n] = await Promise.allSettled([
            api.get('/nursing/shifts'),
            api.get('/nursing/leaves'),
            api.get('/hr/staff?department=Nursing')
        ]);
        if (s.status === 'fulfilled' && s.value.success) setShifts(s.value.data);
        if (l.status === 'fulfilled' && l.value.success) setLeaves(l.value.data);
        if (n.status === 'fulfilled' && n.value.success) {
            setNurses(n.value.data.map(st => ({ _id: st.user?._id || st._id, name: st.user?.name || st.employeeId })));
        }
    };

    const createShift = async () => {
        if (!shiftForm.nurse || !shiftForm.date) { setMsg('Nurse and date required'); setTimeout(() => setMsg(''), 3000); return; }
        const r = await api.post('/nursing/shifts', shiftForm);
        if (r.success) { setMsg('Shift scheduled!'); setShowShift(false); setShiftForm({ nurse: '', date: '', shiftType: 'morning', startTime: '06:00', endTime: '14:00', ward: 'General' }); loadData(); }
        else setMsg(r.message || 'Failed');
        setTimeout(() => setMsg(''), 4000);
    };

    const createLeave = async () => {
        if (!leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason) { setMsg('Start date, end date and reason required'); setTimeout(() => setMsg(''), 3000); return; }
        // Backend uses 'type' field (not 'leaveType')
        const r = await api.post('/nursing/leaves', leaveForm);
        if (r.success) { setMsg('Leave request submitted!'); setShowLeave(false); setLeaveForm({ nurse: '', startDate: '', endDate: '', type: 'casual', reason: '' }); loadData(); }
        else setMsg(r.message || 'Failed');
        setTimeout(() => setMsg(''), 4000);
    };

    const approveLeave = async (id, status) => {
        const r = await api.patch(`/nursing/leaves/${id}`, { status });
        if (r.success) { setMsg(`Leave ${status}!`); loadData(); }
        setTimeout(() => setMsg(''), 3000);
    };

    const checkIn = async (id) => {
        const r = await api.patch(`/nursing/shifts/${id}/checkin`, {});
        if (r.success) { setMsg('Checked in!'); loadData(); }
        else setMsg(r.message || 'Check-in failed');
        setTimeout(() => setMsg(''), 3000);
    };

    const checkOut = async (id) => {
        const r = await api.patch(`/nursing/shifts/${id}/checkout`, {});
        if (r.success) { setMsg('Checked out!'); loadData(); }
        else setMsg(r.message || 'Check-out failed');
        setTimeout(() => setMsg(''), 3000);
    };

    // Auto-update start/end times when shift type changes
    const handleShiftTypeChange = (shiftType) => {
        const times = SHIFT_TIMES[shiftType] || SHIFT_TIMES.morning;
        setShiftForm({ ...shiftForm, shiftType, startTime: times.start, endTime: times.end });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">👩‍⚕️ Nursing Roster</h1><p className="text-sm text-gray-500">Shift scheduling & leave management</p></div>
                <div className="flex gap-2">
                    <button onClick={() => setShowShift(true)} className="btn-primary">+ Schedule Shift</button>
                    <button onClick={() => setShowLeave(true)} className="btn-secondary">+ Leave Request</button>
                </div>
            </div>

            {msg && <div className="p-3 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-medium animate-fade-in">{msg}</div>}

            <div className="flex gap-1 bg-gray-100 dark:bg-dark-800 rounded-lg p-1 w-fit">
                {['shifts', 'leaves'].map((t) => (
                    <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-md text-sm font-medium ${tab === t ? 'bg-white dark:bg-dark-700 shadow text-primary-600' : 'text-gray-500'}`}>{t === 'shifts' ? `Shifts (${shifts.length})` : `Leaves (${leaves.length})`}</button>
                ))}
            </div>

            {tab === 'shifts' && (
                <div className="card overflow-hidden p-0">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-dark-800"><tr>{['Nurse', 'Date', 'Shift', 'Time', 'Ward', 'Status', 'Actions'].map((h) => <th key={h} className="table-header">{h}</th>)}</tr></thead>
                        <tbody>
                            {shifts.map((s) => (
                                <tr key={s._id} className="hover:bg-gray-50 dark:hover:bg-dark-800/50">
                                    <td className="table-cell font-medium">{s.nurse?.name || 'N/A'}</td>
                                    <td className="table-cell">{new Date(s.date).toLocaleDateString()}</td>
                                    <td className="table-cell"><span className={`badge ${s.shiftType === 'morning' ? 'badge-yellow' : s.shiftType === 'afternoon' ? 'badge-blue' : 'badge-purple'}`}>{s.shiftType}</span></td>
                                    <td className="table-cell text-xs">{s.startTime} — {s.endTime}</td>
                                    <td className="table-cell">{s.ward}</td>
                                    <td className="table-cell"><span className={`badge ${s.status === 'completed' ? 'badge-green' : s.status === 'active' ? 'badge-blue' : 'badge-yellow'}`}>{s.status}</span></td>
                                    <td className="table-cell">
                                        <div className="flex gap-1">
                                            {s.status === 'scheduled' && <button onClick={() => checkIn(s._id)} className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 font-medium">Check In</button>}
                                            {s.status === 'active' && <button onClick={() => checkOut(s._id)} className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 font-medium">Check Out</button>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {shifts.length === 0 && <tr><td colSpan="7" className="table-cell text-center text-gray-400 py-8">No shifts scheduled. Click "+ Schedule Shift" to create one.</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            {tab === 'leaves' && (
                <div className="space-y-3">
                    {leaves.map((l) => (
                        <div key={l._id} className="card flex items-center justify-between">
                            <div>
                                <p className="font-medium text-gray-800 dark:text-white">{l.nurse?.name || 'N/A'}</p>
                                <p className="text-sm text-gray-500">{l.reason || 'No reason specified'} • {l.type}</p>
                                <p className="text-xs text-gray-400">{new Date(l.startDate).toLocaleDateString()} → {new Date(l.endDate).toLocaleDateString()}</p>
                            </div>
                            <div className="flex gap-2 items-center">
                                <span className={`badge ${l.status === 'approved' ? 'badge-green' : l.status === 'rejected' ? 'badge-red' : 'badge-yellow'}`}>{l.status}</span>
                                {l.status === 'pending' && <>
                                    <button onClick={() => approveLeave(l._id, 'approved')} className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 font-medium">Approve</button>
                                    <button onClick={() => approveLeave(l._id, 'rejected')} className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 font-medium">Reject</button>
                                </>}
                            </div>
                        </div>
                    ))}
                    {leaves.length === 0 && <div className="card text-center text-gray-400 py-8">No leave requests. Click "+ Leave Request" to submit one.</div>}
                </div>
            )}

            <Modal open={showShift} onClose={() => setShowShift(false)} title="Schedule Shift">
                <div className="space-y-4">
                    <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Nurse *</label>
                        <select className="input-field" value={shiftForm.nurse} onChange={(e) => setShiftForm({ ...shiftForm, nurse: e.target.value })}>
                            <option value="">Select Nurse</option>
                            {nurses.map(n => <option key={n._id} value={n._id}>{n.name}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Date *</label><input type="date" className="input-field" value={shiftForm.date} onChange={(e) => setShiftForm({ ...shiftForm, date: e.target.value })} /></div>
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Shift Type *</label><select className="input-field" value={shiftForm.shiftType} onChange={(e) => handleShiftTypeChange(e.target.value)}><option value="morning">Morning (06-14)</option><option value="afternoon">Afternoon (14-22)</option><option value="night">Night (22-06)</option></select></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Start Time *</label><input type="time" className="input-field" value={shiftForm.startTime} onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })} /></div>
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">End Time *</label><input type="time" className="input-field" value={shiftForm.endTime} onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })} /></div>
                    </div>
                    <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Ward *</label><select className="input-field" value={shiftForm.ward} onChange={(e) => setShiftForm({ ...shiftForm, ward: e.target.value })}>{['General', 'ICU', 'Emergency', 'Pediatric', 'Surgical'].map(w => <option key={w} value={w}>{w}</option>)}</select></div>
                    <div className="flex gap-2 pt-2"><button onClick={createShift} className="btn-primary flex-1">Schedule Shift</button><button onClick={() => setShowShift(false)} className="btn-secondary">Cancel</button></div>
                </div>
            </Modal>

            <Modal open={showLeave} onClose={() => setShowLeave(false)} title="Submit Leave Request">
                <div className="space-y-4">
                    <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Nurse</label>
                        <select className="input-field" value={leaveForm.nurse} onChange={(e) => setLeaveForm({ ...leaveForm, nurse: e.target.value })}>
                            <option value="">Myself (current user)</option>
                            {nurses.map(n => <option key={n._id} value={n._id}>{n.name}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Start Date *</label><input type="date" className="input-field" value={leaveForm.startDate} onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })} /></div>
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">End Date *</label><input type="date" className="input-field" value={leaveForm.endDate} onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })} /></div>
                    </div>
                    <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Type *</label><select className="input-field" value={leaveForm.type} onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })}><option value="casual">Casual</option><option value="sick">Sick</option><option value="emergency">Emergency</option><option value="earned">Earned</option></select></div>
                    <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Reason *</label><textarea className="input-field" rows={2} placeholder="Reason for leave..." value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} /></div>
                    <div className="flex gap-2 pt-2"><button onClick={createLeave} className="btn-primary flex-1">Submit Request</button><button onClick={() => setShowLeave(false)} className="btn-secondary">Cancel</button></div>
                </div>
            </Modal>
        </div>
    );
}
