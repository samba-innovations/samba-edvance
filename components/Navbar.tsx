"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let rafId: number;
    const handleScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setScrolled(window.scrollY > 20);
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-4 lg:pt-6 pointer-events-none">
        <motion.nav
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "pointer-events-auto w-full max-w-7xl rounded-[2rem] transition-all duration-500 overflow-hidden",
            scrolled
              ? "py-3 lg:py-3.5 px-6 lg:px-8 bg-background/70 dark:bg-[#0a0a0a]/70 backdrop-blur-2xl border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)]"
              : "py-4 lg:py-6 px-4 lg:px-6 bg-transparent border border-transparent shadow-none"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Light Mode Logo */}
              <Image
                src="/imgs/edvance-logotipo.svg"
                alt="samba edvance light"
                width={140}
                height={40}
                className="h-8 lg:h-9 w-auto object-contain dark:hidden"
                priority
              />
              {/* Dark Mode Logo */}
              <Image
                src="/imgs/edvance-logotipo2.svg"
                alt="samba edvance dark"
                width={140}
                height={40}
                className="h-8 lg:h-9 w-auto object-contain hidden dark:block"
                priority
              />
            </div>

            {/* Desktop Links - Centered */}
            <div className="hidden lg:flex items-center gap-1 bg-muted/50 dark:bg-white/5 p-1.5 rounded-full border border-border/50">
              <a href="#solucao" className="text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-background/80 dark:hover:bg-white/10 py-2 px-6 rounded-full transition-all">Produto</a>
              <a href="#comofunciona" className="text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-background/80 dark:hover:bg-white/10 py-2 px-6 rounded-full transition-all">Como Funciona</a>
              <a href="#beneficios" className="text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-background/80 dark:hover:bg-white/10 py-2 px-6 rounded-full transition-all">Benefícios</a>
              <a href="#contato" className="text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-background/80 dark:hover:bg-white/10 py-2 px-6 rounded-full transition-all">Contato</a>
            </div>

            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center gap-4">
              <ThemeToggle />
              <Link href="/dashboard" className="relative group bg-primary text-white text-sm font-bold px-7 py-3 rounded-full overflow-hidden transition-transform active:scale-95 shadow-md shadow-primary/20 border border-primary/50">
                <span className="relative z-10">Acessar Plataforma</span>
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out rounded-full"></div>
              </Link>
            </div>

            {/* Mobile Actions */}
            <div className="flex items-center gap-3 lg:hidden">
              <ThemeToggle />
              <button
                className="text-foreground p-2 rounded-full hover:bg-muted/80 transition-colors focus:outline-none"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
              </button>
            </div>
          </div>
        </motion.nav>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.95, y: -20, filter: "blur(10px)" }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed top-[100px] left-4 right-4 bg-background/95 backdrop-blur-3xl border border-border/60 p-6 rounded-[2rem] shadow-2xl z-40 flex flex-col gap-2 lg:hidden origin-top"
          >
            <a href="#solucao" onClick={() => setMobileMenuOpen(false)} className="text-foreground font-semibold p-4 hover:bg-muted/80 rounded-2xl transition-colors flex items-center justify-between group">
              Produto <ArrowRight size={18} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </a>
            <a href="#comofunciona" onClick={() => setMobileMenuOpen(false)} className="text-foreground font-semibold p-4 hover:bg-muted/80 rounded-2xl transition-colors flex items-center justify-between group">
              Como Funciona <ArrowRight size={18} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </a>
            <a href="#beneficios" onClick={() => setMobileMenuOpen(false)} className="text-foreground font-semibold p-4 hover:bg-muted/80 rounded-2xl transition-colors flex items-center justify-between group">
              Benefícios <ArrowRight size={18} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </a>
            <a href="#contato" onClick={() => setMobileMenuOpen(false)} className="text-foreground font-semibold p-4 hover:bg-muted/80 rounded-2xl transition-colors flex items-center justify-between group">
              Contato <ArrowRight size={18} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </a>

            <div className="h-px w-full bg-border/60 my-4"></div>

            <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="bg-primary text-white p-4 rounded-2xl font-bold shadow-xl shadow-primary/20 w-full active:scale-95 transition-transform text-center block">
              Acessar Plataforma
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
