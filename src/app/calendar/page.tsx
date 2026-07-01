"use client";

import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Clock,
  MapPin,
  Phone,
  Globe,
  CheckCircle2,
  XCircle,
  Calendar as CalendarIcon,
  User,
} from "lucide-react";
import { useData } from "@/lib/store";
import type { Meeting, Lead } from "@/lib/types";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarPage() {
  const { meetings, leads, addMeeting, updateMeeting, addNotification } = useData();
  const [today] = useState(new Date());
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Form state
  const [formLeadId, setFormLeadId] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formTime, setFormTime] = useState("09:00");
  const [formDuration, setFormDuration] = useState(30);
  const [formNotes, setFormNotes] = useState("");

  useEffect(() => { setMounted(true); }, []);

  // Calendar math
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  function prevMonth() {
    setViewDate(new Date(year, month - 1, 1));
    setSelectedDate(null);
  }
  function nextMonth() {
    setViewDate(new Date(year, month + 1, 1));
    setSelectedDate(null);
  }

  // Build calendar grid
  const cells: (number | null)[] = [];
  // Previous month padding
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push(daysInPrevMonth - i);
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(d);
  }
  // Next month padding
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push(null);
  }

  function dateStr(day: number): string {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const isSelected = (day: number) => selectedDate === dateStr(day);

  // Meetings for selected date
  const selectedMeetings = selectedDate
    ? meetings.filter((m) => m.date === selectedDate)
    : [];

  const dayMeetings = (day: number) =>
    meetings.filter((m) => m.date === dateStr(day));

  function handleAddMeeting(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDate || !formTitle.trim()) return;

    const lead = leads.find((l) => l.id === formLeadId);
    addMeeting({
      leadId: formLeadId || undefined,
      leadName: lead?.businessName || formTitle,
      title: formTitle.trim(),
      date: selectedDate,
      time: formTime,
      duration: formDuration,
      notes: formNotes.trim(),
      status: "scheduled",
    });

    addNotification(`Meeting scheduled: ${formTitle.trim()}`, "info", "/calendar");
    setShowAdd(false);
    setFormTitle("");
    setFormLeadId("");
    setFormTime("09:00");
    setFormDuration(30);
    setFormNotes("");
  }

  function handleStatus(meetingId: string, status: Meeting["status"]) {
    updateMeeting(meetingId, { status });
    addNotification(
      `Meeting marked ${status}`,
      status === "completed" ? "success" : "info",
      "/calendar"
    );
  }

  if (!mounted) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Calendar</h1>
          <p className="text-text-muted text-sm mt-0.5">
            {meetings.length} meeting{meetings.length !== 1 ? "s" : ""} scheduled
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-lg font-bold text-text-primary min-w-[180px] text-center">
            {MONTHS[month]} {year}
          </span>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
              setSelectedDate(dateStr(today.getDate()));
            }}
            className="ml-2 text-xs text-primary hover:underline"
          >
            Today
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar grid */}
        <div className="lg:col-span-2 bg-surface-1 border border-border rounded-xl overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-border">
            {DAYS.map((d) => (
              <div key={d} className="p-2 text-center text-xs font-medium text-text-muted">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              const isPadding = day === null;
              const isPrevMonth = i < firstDay && !isPadding;
              const inMonth = !isPadding && !isPrevMonth;
              const d = day as number;
              const ds = inMonth ? dateStr(d) : "";
              const meetingsOnDay = inMonth ? dayMeetings(d) : [];
              const todayCell = inMonth && isToday(d);
              const selectedCell = inMonth && isSelected(d);

              return (
                <button
                  key={i}
                  onClick={() => inMonth && setSelectedDate(ds)}
                  className={`min-h-[80px] p-1.5 border-b border-r border-border/50 text-left transition-colors hover:bg-surface-2/50 ${
                    isPadding ? "bg-surface-2/30 text-text-muted/30" : ""
                  } ${isPrevMonth ? "bg-surface-2/20 text-text-muted/40" : ""}`}
                >
                  <span
                    className={`text-xs inline-flex items-center justify-center w-6 h-6 rounded-full ${
                      todayCell
                        ? "bg-primary text-white font-bold"
                        : selectedCell
                          ? "bg-primary/20 text-primary font-medium"
                          : "text-text-secondary"
                    }`}
                  >
                    {d}
                  </span>
                  {/* Meeting dots */}
                  <div className="mt-1 space-y-0.5">
                    {meetingsOnDay.slice(0, 3).map((m) => (
                      <div
                        key={m.id}
                        className={`text-[10px] leading-tight truncate px-1 py-0.5 rounded ${
                          m.status === "completed"
                            ? "bg-accent/15 text-accent"
                            : m.status === "cancelled"
                              ? "bg-text-muted/10 text-text-muted line-through"
                              : "bg-primary/15 text-primary"
                        }`}
                      >
                        {m.time} {m.leadName}
                      </div>
                    ))}
                    {meetingsOnDay.length > 3 && (
                      <span className="text-[10px] text-text-muted">
                        +{meetingsOnDay.length - 3} more
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Side panel — selected day */}
        <div className="bg-surface-1 border border-border rounded-xl p-4">
          {selectedDate ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm text-text-primary">
                  {new Date(selectedDate + "T12:00").toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </h3>
                <button
                  onClick={() => setShowAdd(true)}
                  className="flex items-center gap-1 text-xs bg-primary hover:bg-primary-hover text-white rounded-lg px-2.5 py-1.5 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </button>
              </div>

              {/* Add form */}
              {showAdd && (
                <form onSubmit={handleAddMeeting} className="mb-4 p-3 bg-surface-2 border border-border rounded-lg space-y-2">
                  <input
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Meeting title..."
                    required
                    className="w-full bg-surface-1 border border-border rounded px-2 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
                  />
                  <div className="flex gap-2">
                    <input
                      type="time"
                      value={formTime}
                      onChange={(e) => setFormTime(e.target.value)}
                      className="w-24 bg-surface-1 border border-border rounded px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-primary"
                    />
                    <select
                      value={formDuration}
                      onChange={(e) => setFormDuration(Number(e.target.value))}
                      className="bg-surface-1 border border-border rounded px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-primary"
                    >
                      <option value={15}>15 min</option>
                      <option value={30}>30 min</option>
                      <option value={45}>45 min</option>
                      <option value={60}>1 hour</option>
                      <option value={90}>1.5 hours</option>
                    </select>
                  </div>
                  <select
                    value={formLeadId}
                    onChange={(e) => setFormLeadId(e.target.value)}
                    className="w-full bg-surface-1 border border-border rounded px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-primary"
                  >
                    <option value="">No lead linked</option>
                    {leads.slice(0, 50).map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.businessName}
                      </option>
                    ))}
                  </select>
                  <textarea
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Notes..."
                    rows={2}
                    className="w-full bg-surface-1 border border-border rounded px-2 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 bg-primary hover:bg-primary-hover text-white text-xs font-medium rounded px-3 py-1.5 transition-colors"
                    >
                      Schedule
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAdd(false)}
                      className="px-3 py-1.5 text-xs text-text-muted hover:text-text-primary border border-border rounded transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Meetings list */}
              {selectedMeetings.length === 0 ? (
                <p className="text-sm text-text-muted text-center py-8">
                  No meetings this day
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedMeetings.map((m) => {
                    const lead = m.leadId ? leads.find((l) => l.id === m.leadId) : null;
                    return (
                      <div
                        key={m.id}
                        className={`p-3 rounded-lg border ${
                          m.status === "completed"
                            ? "bg-accent/5 border-accent/20"
                            : m.status === "cancelled"
                              ? "bg-surface-2/50 border-border/50 opacity-60"
                              : "bg-primary/5 border-primary/20"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className={`text-sm font-medium ${
                              m.status === "cancelled" ? "line-through text-text-muted" : "text-text-primary"
                            }`}>
                              {m.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {m.time} ({m.duration}min)
                              </span>
                              {m.leadName && (
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {m.leadName}
                                </span>
                              )}
                            </div>
                            {lead?.phone && (
                              <a href={`tel:${lead.phone}`} className="flex items-center gap-1 mt-1 text-xs text-primary hover:underline">
                                <Phone className="w-3 h-3" />
                                {lead.phone}
                              </a>
                            )}
                            {lead?.website && (
                              <a href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 mt-0.5 text-xs text-secondary hover:underline">
                                <Globe className="w-3 h-3" />
                                {lead.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                              </a>
                            )}
                            {m.notes && (
                              <p className="text-xs text-text-muted mt-1.5 bg-surface-1 rounded p-1.5">
                                {m.notes}
                              </p>
                            )}
                          </div>

                          {/* Status buttons */}
                          <div className="flex items-center gap-1 shrink-0">
                            {m.status === "scheduled" && (
                              <>
                                <button
                                  onClick={() => handleStatus(m.id, "completed")}
                                  className="p-1 rounded text-text-muted hover:text-accent hover:bg-accent/10 transition-colors"
                                  title="Mark completed"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleStatus(m.id, "cancelled")}
                                  className="p-1 rounded text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                                  title="Cancel"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {m.status !== "scheduled" && (
                              <button
                                onClick={() => handleStatus(m.id, "scheduled")}
                                className="text-xs text-text-muted hover:text-primary underline"
                              >
                                Reopen
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <CalendarIcon className="w-10 h-10 text-text-muted mx-auto mb-3" />
              <p className="text-text-muted text-sm">Select a date to view meetings</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
