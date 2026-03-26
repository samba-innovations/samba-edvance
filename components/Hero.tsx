"use client";

import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Plus } from "lucide-react";

export function Hero() {
  return (
    <section className="relative min-h-dvh flex items-center pt-28 pb-16 lg:pt-32 overflow-hidden bg-background">
      {/* Animated Organic Background Orbs */}
      {/* Blob 1 — só translate no motion, blur no filho estático */}
      <motion.div
        animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        style={{ willChange: "transform" }}
        className="pointer-events-none absolute -top-[10%] -left-[10%] w-[50%] h-[50%] z-0"
      >
        <div className="w-full h-full min-w-100 min-h-100 bg-primary/30 dark:bg-primary/20 rounded-[40%_60%_70%_30%] blur-[120px]" />
      </motion.div>
      {/* Blob 2 */}
      <motion.div
        animate={{ x: [0, -50, 0], y: [0, 50, 0] }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        style={{ willChange: "transform" }}
        className="pointer-events-none absolute bottom-[10%] -right-[10%] w-[40%] h-[40%] z-0"
      >
        <div className="w-full h-full min-w-75 min-h-75 bg-secondary/40 dark:bg-secondary/20 rounded-full blur-[100px]" />
      </motion.div>
      {/* Blob 3 */}
      <motion.div
        animate={{ x: [0, 80, 0], y: [0, -60, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        style={{ willChange: "transform" }}
        className="pointer-events-none absolute top-[20%] left-[30%] w-[30%] h-[30%] z-0"
      >
        <div className="w-full h-full min-w-50 min-h-50 bg-primary/20 dark:bg-primary/10 rounded-full blur-[90px]" />
      </motion.div>

      <div className="container mx-auto px-6 lg:px-12 relative z-10">
        <div className="flex flex-col lg:flex-row gap-16 items-center">
          {/* Left Text Content */}
          <div className="lg:w-[55%] text-left">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 dark:border-primary/30 bg-primary/5 dark:bg-primary/10 text-primary dark:text-cyan-300 text-sm font-semibold mb-6 shadow-sm"
            >
              <span className="flex h-2 w-2 rounded-full bg-secondary shadow-[0_0_10px_var(--color-secondary)]"></span>
              Simulados Padronizados para a Rede Pública
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: "backOut" }}
              className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground leading-tight mb-8"
            >
              Criação e Gestão de <span className="text-gradient block mt-2">Simulados.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: "backOut" }}
              className="text-xl text-muted-foreground leading-relaxed mb-10 max-w-xl"
            >
              O samba edvance centraliza a criação, distribuição e análise de simulados, padronizando avaliações em toda a rede e transformando resultados em dados pedagógicos acionáveis.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3, ease: "backOut" }}
              className="bg-card w-full max-w-lg p-3 rounded-2xl border border-border shadow-2xl flex flex-col sm:flex-row gap-3 relative focus-within:border-primary/50 transition-colors"
            >
              <input
                type="email"
                placeholder="Seu e-mail corporativo"
                className="w-full bg-transparent px-4 py-3 outline-none text-foreground placeholder-muted-foreground"
              />
              <a
                href="#contato"
                className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-md shrink-0 whitespace-nowrap"
              >
                Falar Especialista <ArrowRight size={18} />
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-6 flex gap-6 text-sm text-muted-foreground font-medium"
            >
              <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500" /> Implantação rápida</div>
              <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500" /> Suporte dedicado</div>
            </motion.div>
          </div>

          {/* Right Visual Content (Mockup Illustration) */}
          <div className="lg:w-[45%] w-full">
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "backOut" }}
              className="relative w-full aspect-square max-w-lg mx-auto"
            >
              {/* Simulado Creator Mockup */}
              <div className="absolute inset-0 bg-card rounded-[2.5rem] border border-border shadow-2xl overflow-hidden flex flex-col">
                {/* Window Header */}
                <div className="w-full h-14 border-b border-border bg-muted/30 flex items-center justify-between px-5 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground">Novo Simulado</span>
                  <div className="bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">
                    Publicar
                  </div>
                </div>

                {/* Title field */}
                <div className="w-full px-5 pt-4 shrink-0">
                  <div className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 flex items-center gap-2">
                    <div className="h-3 w-48 bg-foreground/20 rounded"></div>
                    <motion.div
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="w-0.5 h-3.5 bg-primary rounded-full"
                    />
                  </div>
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs bg-primary/10 text-primary font-semibold px-2.5 py-1 rounded-full">Matemática</span>
                    <span className="text-xs bg-muted text-muted-foreground font-semibold px-2.5 py-1 rounded-full">9º Ano B</span>
                    <span className="text-xs bg-muted text-muted-foreground font-semibold px-2.5 py-1 rounded-full">3º Bimestre</span>
                  </div>
                </div>

                {/* Question being built */}
                <div className="w-full px-5 pt-3 flex-1 flex flex-col gap-2.5 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-secondary bg-secondary/10 px-2.5 py-1 rounded-full">Questão 4</span>
                    <span className="text-xs text-muted-foreground">10 questões no total</span>
                  </div>

                  {/* Question text input */}
                  <div className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2.5 space-y-1.5">
                    <div className="h-2.5 bg-muted-foreground/20 rounded w-full"></div>
                    <div className="h-2.5 bg-muted-foreground/20 rounded w-4/5"></div>
                  </div>

                  {/* Options — B marcada como gabarito */}
                  {[
                    { letter: "A", correct: false, width: "w-3/5" },
                    { letter: "B", correct: true,  width: "w-4/5" },
                    { letter: "C", correct: false, width: "w-1/2" },
                    { letter: "D", correct: false, width: "w-2/3" },
                  ].map((opt, i) => (
                    <motion.div
                      key={opt.letter}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.35 + i * 0.07 }}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border ${
                        opt.correct
                          ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/40"
                          : "bg-muted/40 border-border"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                        opt.correct ? "bg-emerald-500 text-white" : "bg-muted-foreground/15 text-muted-foreground"
                      }`}>
                        {opt.letter}
                      </div>
                      <div className={`h-2 rounded-full flex-1 ${opt.correct ? "bg-emerald-400/40" : "bg-muted-foreground/15"}`} style={{ maxWidth: opt.width.replace("w-","").includes("/") ? undefined : undefined }}>
                      </div>
                      <div className={`h-2 rounded-full ${opt.width} ${opt.correct ? "bg-emerald-400/40" : "bg-muted-foreground/15"}`}></div>
                      {opt.correct && (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">gabarito</span>
                      )}
                    </motion.div>
                  ))}
                </div>

                {/* Bottom bar */}
                <div className="w-full px-5 py-3.5 border-t border-border flex items-center justify-between shrink-0">
                  <span className="text-xs text-muted-foreground font-medium">4 de 10 questões</span>
                  <button className="flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-full">
                    <Plus size={12} /> Adicionar
                  </button>
                </div>
              </div>

              {/* Floating Overlay */}
              <motion.div
                animate={{ y: [0, 10, 0] }} transition={{ duration: 5, repeat: Infinity, delay: 2 }}
                className="absolute -right-8 bottom-24 bg-card border border-border p-4 rounded-2xl shadow-xl flex items-center gap-4 z-20"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <div className="text-sm font-bold text-foreground">Questão adicionada</div>
                  <div className="text-xs text-muted-foreground">4 de 10 · Matemática</div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
