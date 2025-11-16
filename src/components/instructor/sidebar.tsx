"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BookOpen,
  MessageSquare,
  BarChart3,
  DollarSign,
  Tag,
  Settings,
  LogOut,
  MessageCircle,
} from "lucide-react";

const menuItems = [
  {
    title: "Dashboard",
    href: "/instructor/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Meus Cursos",
    href: "/instructor/courses",
    icon: BookOpen,
  },
  {
    title: "Q&A / Fórum",
    href: "/instructor/communication/qa",
    icon: MessageSquare,
  },
  {
    title: "Mensagens",
    href: "/instructor/communication/messages",
    icon: MessageCircle,
  },
  {
    title: "Analytics",
    href: "/instructor/analytics",
    icon: BarChart3,
  },
  {
    title: "Finanças",
    href: "/instructor/analytics/finances",
    icon: DollarSign,
  },
  {
    title: "Promoções",
    href: "/instructor/promotions",
    icon: Tag,
  },
  {
    title: "Configurações",
    href: "/instructor/settings",
    icon: Settings,
  },
];

export function InstructorSidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-xl font-bold">Painel do Instrutor</h1>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.title}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-4">
        <Link
          href="/"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <LogOut className="h-5 w-5" />
          Voltar ao Site
        </Link>
      </div>
    </div>
  );
}
