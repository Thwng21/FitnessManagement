"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dumbbell, Calendar, Activity, Camera, BarChart3, Sparkles, Moon, Sun, Menu, X } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Sheet, SheetContent, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet"
import { useAuth } from "@/context/auth.context"
import { LogOut } from "lucide-react"

const Header = () => {
  const { theme, setTheme } = useTheme()
  const { user, logout } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  // Fix: Thêm cleanup function và xử lý mounted đúng cách
  useEffect(() => {
    setMounted(true)
    // Cleanup function để tránh memory leak
    return () => {
      setMounted(false)
    }
  }, [])

  // Fix: Ngăn chặn re-render vô hạn khi mounted thay đổi
  if (!mounted) {
    return null
  }

  const navItems = [
    { href: "/", icon: Activity, label: "Tổng quan" },
    { href: "/calendar", icon: Calendar, label: "Lịch" },
    { href: "/workout", icon: Dumbbell, label: "Tập luyện" },
    { href: "/body", icon: Activity, label: "Chỉ số" },
    { href: "/photos", icon: Camera, label: "Hình ảnh" },
    { href: "/stats", icon: BarChart3, label: "Thống kê" },
  ]

  return (
    <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-xl border-b border-border/40 supports-backdrop-filter:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">

        {/* Logo */}
        <Link href="/" className="group flex items-center gap-2.5 transition-all hover:opacity-80">
          <img
            src="/images/logoicon.png"
            alt="Logo"
            className="h-8 w-8 object-contain rounded-xl shadow-lg"
            
          />
          <span className="text-xl font-semibold tracking-tight bg-linear-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
            GwouthFit
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Button>
            </Link>
          ))}
        </nav>

        {/* Desktop Right Side */}
        <div className="hidden lg:flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-border/60 bg-transparent hover:bg-linear-to-r hover:from-emerald-500/10 hover:to-teal-500/10 hover:border-emerald-500/30 dark:hover:from-emerald-500/20 dark:hover:to-teal-500/20 transition-all duration-300"
          >
            <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
            Nâng cấp
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full border border-border/40 bg-transparent hover:bg-accent/50 transition-all"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Chuyển đổi giao diện</span>
          </Button>

          <Avatar className="h-9 w-9 cursor-pointer ring-2 ring-border/40 ring-offset-2 ring-offset-background transition-all hover:ring-emerald-500/40 dark:hover:ring-emerald-500/50">
            <AvatarFallback className="bg-linear-to-br from-emerald-500/20 to-teal-500/20 text-sm font-medium text-emerald-700 dark:text-emerald-400">
              {user?.firstName?.charAt(0) || user?.email?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>

          {user && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full border border-destructive/20 bg-transparent hover:bg-destructive/10 text-destructive transition-all"
              onClick={logout}
              title="Đăng xuất"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Mobile Section */}
        <div className="flex lg:hidden items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full border border-border/40 bg-transparent hover:bg-accent/50 transition-all"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Chuyển đổi giao diện</span>
          </Button>

          <Avatar className="h-8 w-8 cursor-pointer ring-2 ring-border/40 ring-offset-2 ring-offset-background">
            <AvatarFallback className="bg-linear-to-br from-emerald-500/20 to-teal-500/20 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              TT
            </AvatarFallback>
          </Avatar>

          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg border border-border/40">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Mở menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[350px] p-0">
              <div className="sr-only">
                <SheetTitle>Menu điều hướng</SheetTitle>
                <SheetDescription>
                  Menu điều hướng chính của ứng dụng GwouthFit
                </SheetDescription>
              </div>
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between p-4 border-b border-border/40">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-linear-to-br from-emerald-500 to-teal-600">
                      <Dumbbell className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-semibold text-lg">GwouthFit</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <nav className="flex-1 py-4">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all duration-200"
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  ))}
                </nav>

                <div className="p-4 border-t border-border/40 space-y-3">
                  {user && (
                    <Button
                      variant="destructive"
                      className="w-full gap-2 rounded-xl font-bold"
                      onClick={logout}
                    >
                      <LogOut className="h-4 w-4" />
                      Đăng xuất
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="w-full gap-2 border-border/60 hover:bg-linear-to-r hover:from-emerald-500/10 hover:to-teal-500/10 rounded-xl"
                  >
                    <Sparkles className="h-4 w-4 text-emerald-500" />
                    Nâng cấp
                  </Button>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm text-muted-foreground">Phiên bản 1.0.0</span>
                    <div className="flex items-center gap-1">
                      <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                      <span className="text-xs text-muted-foreground">Đã kết nối</span>
                    </div>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

      </div>
    </header>
  )
}

export default Header