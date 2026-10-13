"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Genel Bakış", icon: "📊" },
  { href: "/courses", label: "Kurslar", icon: "🎓" },
  { href: "/categories", label: "Kategoriler", icon: "🗂️" },
  { href: "/instructors", label: "Eğitmenler", icon: "🧑‍🏫" },
  { href: "/users", label: "Kullanıcılar", icon: "👥" },
  { href: "/moderation", label: "Moderasyon", icon: "🛡️" },
  { href: "/media", label: "Medya", icon: "🎬" },
  { href: "/articles", label: "Makaleler", icon: "📰" },
  { href: "/learn", label: "Dil Yolu", icon: "🧭" },
  { href: "/certificates", label: "Sertifikalar", icon: "📜" },
  { href: "/stories", label: "Hikâyeler", icon: "✨" },
  { href: "/push", label: "Bildirimler", icon: "📣" }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-border bg-white">
      <div className="flex items-center gap-2 px-6 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink text-sm font-black text-white">T</div>
        <div>
          <div className="text-sm font-black tracking-wide text-ink">TENGRIA</div>
          <div className="text-xs text-muted">Admin Panel</div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                active ? "bg-ink text-white" : "text-ink/80 hover:bg-surface"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-6 py-4 text-xs text-muted">Tengria © {new Date().getFullYear()}</div>
    </aside>
  );
}
