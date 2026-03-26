"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Bell, Check, CheckCheck, ExternalLink, Inbox } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getNotifications, markAllAsRead, markAsRead } from "@/lib/notification-actions";
import { useRouter } from "next/navigation";

type Notification = {
  id: number;
  title: string;
  message: string | null;
  link: string | null;
  isRead: boolean;
  createdAt: Date;
};

function timeAgo(date: Date) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60)   return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

interface Props {
  initialCount: number;
}

export function NotificationPopover({ initialCount }: Props) {
  const router = useRouter();
  const [open, setOpen]                 = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread]             = useState(initialCount);
  const [loaded, setLoaded]             = useState(false);
  const [isPending, startTransition]    = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Carrega ao abrir
  useEffect(() => {
    if (!open || loaded) return;
    startTransition(async () => {
      const data = await getNotifications();
      setNotifications(data as Notification[]);
      setUnread(data.filter((n: Notification) => !n.isRead).length);
      setLoaded(true);
    });
  }, [open, loaded]);

  // Polling a cada 60s para atualizar badge
  useEffect(() => {
    const interval = setInterval(async () => {
      const data = await getNotifications();
      setNotifications(data as Notification[]);
      setUnread(data.filter((n: Notification) => !n.isRead).length);
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  function handleOpen() {
    setOpen(v => !v);
  }

  async function handleMarkOne(n: Notification) {
    if (!n.isRead) {
      await markAsRead(n.id);
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, isRead: true } : x));
      setUnread(v => Math.max(0, v - 1));
    }
    if (n.link) {
      setOpen(false);
      router.push(n.link);
    }
  }

  async function handleMarkAll() {
    await markAllAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnread(0);
  }

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className="relative flex items-center justify-center w-10 h-10 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all border border-transparent hover:border-primary/20"
        title="Notificações"
      >
        <Bell size={18} />
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-primary text-white text-[10px] font-black rounded-full flex items-center justify-center leading-none"
            >
              {unread > 99 ? "99+" : unread}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Popover */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 top-12 w-[360px] bg-card border border-border rounded-[1.5rem] shadow-2xl shadow-black/20 z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-primary" />
                <span className="font-black text-sm text-foreground">Notificações</span>
                {unread > 0 && (
                  <span className="bg-primary/10 text-primary text-[10px] font-black px-2 py-0.5 rounded-full">
                    {unread} nova{unread !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              {unread > 0 && (
                <button
                  onClick={handleMarkAll}
                  disabled={isPending}
                  className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-primary transition-colors"
                >
                  <CheckCheck size={13} />
                  Marcar todas
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-[420px] overflow-y-auto divide-y divide-border/50">
              {!loaded && (
                <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
                  Carregando...
                </div>
              )}
              {loaded && notifications.length === 0 && (
                <div className="flex flex-col items-center justify-center h-32 gap-3 text-center p-6">
                  <Inbox size={28} className="text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground font-medium">Nenhuma notificação</p>
                </div>
              )}
              {loaded && notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleMarkOne(n)}
                  className={`w-full text-left px-5 py-4 flex items-start gap-3 transition-colors hover:bg-muted/40 ${
                    !n.isRead ? "bg-primary/5" : ""
                  }`}
                >
                  {/* Unread dot */}
                  <div className="mt-1.5 shrink-0">
                    {n.isRead
                      ? <div className="w-2 h-2 rounded-full bg-border" />
                      : <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug truncate ${!n.isRead ? "font-bold text-foreground" : "font-medium text-foreground/80"}`}>
                      {n.title}
                    </p>
                    {n.message && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground/60 font-bold mt-1.5 uppercase tracking-wider">
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>

                  {n.link && (
                    <ExternalLink size={13} className="text-muted-foreground/40 shrink-0 mt-1" />
                  )}
                </button>
              ))}
            </div>

            {/* Footer */}
            {loaded && notifications.length > 0 && (
              <div className="px-5 py-3 border-t border-border bg-muted/20">
                <p className="text-[10px] text-muted-foreground text-center font-medium">
                  Mostrando as últimas {notifications.length} notificações
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
