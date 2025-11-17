'use client';

import { useState, useMemo } from 'react';
import { Activity, FileText, Loader2, MailPlus, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAgentStore } from '@/store/agentStore';

interface AgentResult {
  success?: boolean;
  docUrl?: string;
  gmailDraftId?: string;
  needsAuth?: boolean;
  redirectUrl?: string;
  error?: string;
}

export default function Home() {
  const [query, setQuery] = useState('');
  const [email, setEmail] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<AgentResult | null>(null);
  const [authRedirectUrl, setAuthRedirectUrl] = useState<string | null>(null);
  const { userId, logs, addLog, clearLogs } = useAgentStore();


  const handleRun = async () => {

    setRunning(true);
    clearLogs();
    setResult(null);

    addLog('START', 'Starting research agent...');

    const res = await fetch('/api/agent/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        question: query,
        recipientEmail: email || undefined
      })
    });

    const data: AgentResult = await res.json();

    if (data.needsAuth) {
      addLog('AUTH', 'Google authorization required. Completing OAuth flow...');
      setAuthRedirectUrl(data.redirectUrl ?? null);

      if (data.redirectUrl && typeof window !== 'undefined') {
        const newWindow = window.open(data.redirectUrl, '_blank', 'noopener');
        if (!newWindow) {
          addLog('AUTH', 'Popup blocked. Use the button below to finish connecting.');
        }
      }

      setRunning(false);
      return;
    }

    setAuthRedirectUrl(null);

    if (data.success) {
      addLog('COMPLETE', 'Research complete!');
      setResult(data);
    } else {
      addLog('ERROR', data.error || 'Unknown error');
      setResult(data);
    }

    setRunning(false);
  };

  const disableRun = running || !query.trim();
  const authStatus = authRedirectUrl
    ? {
        badge: 'Action Required',
        message: 'Please finish connecting your Google account to proceed.'
      }
    : {
        badge: 'Ready',
        message: 'Google auth handled automatically when you run the agent.'
      };
  const authBadgeClass = authRedirectUrl
    ? 'bg-amber-500/20 text-amber-800'
    : 'bg-emerald-500/15 text-emerald-500';

  const openAuthWindow = () => {
    if (authRedirectUrl && typeof window !== 'undefined') {
      window.open(authRedirectUrl, '_blank', 'noopener');
    }
  };

  const formattedLogs = useMemo(() => {
    if (!logs.length) return [];
    return logs
      .slice()
      .reverse()
      .map((log) => ({
        ...log,
        timeLabel: new Date(log.time).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      }));
  }, [logs]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.15),transparent_55%)] dark:bg-[radial-gradient(circle_at_top,_rgba(79,70,229,0.25),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-24 -z-10 mx-auto h-48 w-[32rem] rounded-full bg-primary/20 blur-[140px] opacity-40 dark:opacity-60" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Sparkles className="size-3" />
              LangGraph • Composio
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Deep Research Agent
            </h1>
            <p className="mt-3 max-w-2xl text-base text-muted-foreground">
              Launch a six-stage research workflow that plans, searches, summarizes, drafts, and ships a polished
              Google Doc + Gmail draft in one go.
            </p>
          </div>

        </header>

        <section className="mt-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-border/60 bg-card/70 p-6 shadow-xl shadow-black/5 backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Authentication</p>
                  <p className="text-lg font-semibold text-foreground">Server-Side OAuth</p>
                  <p className="text-xs text-muted-foreground">{authStatus.message}</p>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${authBadgeClass}`}
                >
                  <Activity className="size-4" />
                  {authStatus.badge}
                </span>
              </div>
            </div>

            <div className="rounded-3xl border border-border/60 bg-card/70 p-6 shadow-xl shadow-black/5 backdrop-blur">
              <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                <div className="space-y-2">
                  <Label htmlFor="query">Research Brief</Label>
                  <Textarea
                    id="query"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Please research the main sourcing platforms for data driven VCs. Return a list of platforms and a short description about them. Cite sources. After you're done, pre-draft an email to georgiy@enteroverdrive.com to share the doc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Recipient Email (optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="georgiy@enteroverdrive.com"
                  />
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                  <Button type="button" className="w-full sm:w-auto" disabled={disableRun} onClick={handleRun}>
                    {running ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Running
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-4" /> Run Agent
                      </>
                    )}
                  </Button>
                </div>
              </form>
              {authRedirectUrl && (
                <div className="rounded-3xl border border-dashed border-amber-400/60 bg-amber-50/40 p-6 text-sm text-amber-900">
                  <p className="font-semibold">Finish Google authorization</p>
                  <p className="mt-2 text-amber-800">
                    We opened a new tab for Google OAuth. If you didn&apos;t see it, click below to launch
                    the consent flow again, then rerun the agent.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4 border-amber-400 text-amber-900 hover:bg-amber-100"
                    onClick={openAuthWindow}
                  >
                    Continue Google Auth
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="rounded-3xl border border-border/60 bg-card/70 p-6 shadow-xl shadow-black/5 backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Live Run Log</p>
                  <p className="text-xl font-semibold">{logs.length ? 'Streaming events' : 'Awaiting prompts'}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={clearLogs} disabled={!logs.length}>
                  Clear
                </Button>
              </div>
              <div className="mt-4 h-72 overflow-y-auto rounded-2xl border border-black/10 bg-black text-xs text-green-400 shadow-inner shadow-black/60 dark:border-white/10 dark:bg-zinc-950">
                <div className="divide-y divide-white/5 font-mono">
                  {formattedLogs.length ? (
                    formattedLogs.map((log) => (
                      <div key={`${log.step}-${log.time}`} className="flex items-start gap-3 px-4 py-3">
                        <span className="text-[10px] uppercase text-emerald-300">{log.timeLabel}</span>
                        <span className="text-emerald-400">[{log.step}]</span>
                        <span className="flex-1 text-emerald-100">{log.msg}</span>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-6 text-center text-muted-foreground">No logs yet — hit Run Agent.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border/60 bg-card/70 p-6 shadow-xl shadow-black/5 backdrop-blur">
              <div className="flex items-center gap-3">
                <FileText className="size-5 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Outputs</p>
                  <p className="text-xl font-semibold">Docs & drafts</p>
                </div>
              </div>

              {result?.docUrl ? (
                <div className="mt-4 space-y-4 text-sm">
                  <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3">
                    <p className="text-xs uppercase text-muted-foreground">Google Doc</p>
                    <a
                      href={result.docUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-2 text-base font-semibold text-primary underline-offset-4 hover:underline"
                    >
                      Open research output
                    </a>
                  </div>
                  {result.gmailDraftId && (
                    <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3">
                      <p className="text-xs uppercase text-muted-foreground">Gmail Draft</p>
                      <p className="mt-1 inline-flex items-center gap-2 font-semibold">
                        <MailPlus className="size-4" /> {result.gmailDraftId}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
                  Outputs will appear here after a successful run.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
