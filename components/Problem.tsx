"use client";

import { motion } from "framer-motion";
import { AlertTriangle, TrendingDown, Clock } from "lucide-react";

export function Problem() {
  return (
    <section id="problema" className="py-24 bg-muted/40 border-t border-border">
      <div className="container mx-auto px-6 lg:px-12">
        <div className="flex flex-col lg:flex-row gap-16 items-center">
          <div className="lg:w-1/2">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-sm font-bold text-primary tracking-widest uppercase mb-3"
            >
              O Problema
            </motion.h2>
            <motion.h3
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-3xl md:text-5xl font-extrabold text-foreground mb-6 leading-tight"
            >
              Os simulados escolares estão <span className="text-destructive dark:text-red-400">sem padrão</span>.
            </motion.h3>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-lg text-muted-foreground mb-8 leading-relaxed"
            >
              Em escolas públicas, cada professor cria seus simulados do zero, sem banco de questões compartilhado, sem padronização de formato e sem análise centralizada de resultados. A avaliação que deveria guiar o ensino vira mais uma tarefa burocrática isolada.
            </motion.p>

            <div className="space-y-6">
              {[
                { icon: Clock, text: "Professores gastam horas criando provas do zero, sem reaproveitamento de questões entre colegas." },
                { icon: AlertTriangle, text: "Resultados em planilhas avulsas impossibilitam comparação de desempenho entre turmas e unidades." },
                { icon: TrendingDown, text: "Sem análise estruturada, não é possível identificar quais conteúdos a rede toda precisa reforçar." }
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + (i * 0.1) }}
                  className="flex items-start gap-4"
                >
                  <div className="mt-1 bg-destructive/10 dark:bg-red-500/10 p-2.5 rounded-xl text-destructive dark:text-red-400">
                    <item.icon size={22} />
                  </div>
                  <p className="text-foreground font-medium text-lg pt-1">{item.text}</p>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="lg:w-1/2 relative w-full">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="relative w-full aspect-square md:aspect-[4/3] rounded-3xl overflow-hidden border border-border bg-card shadow-2xl flex items-center justify-center p-8"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-destructive/5 to-transparent dark:from-red-500/5"></div>
              <div className="w-full max-w-sm space-y-4 relative z-10 opacity-60">
                <div className="h-12 bg-muted rounded-xl w-3/4 shadow-sm"></div>
                <div className="h-12 bg-muted rounded-xl w-full shadow-sm"></div>
                <div className="h-12 bg-destructive/20 dark:bg-red-500/20 rounded-xl w-5/6 border border-destructive/30 shadow-sm relative">
                  <div className="absolute -right-4 -top-4 w-8 h-8 rounded-full bg-destructive flex items-center justify-center text-white">!</div>
                </div>
                <div className="h-12 bg-muted rounded-xl w-1/2 shadow-sm"></div>

                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[10deg] bg-destructive text-white px-8 py-4 rounded-full font-bold shadow-2xl border-4 border-card text-lg whitespace-nowrap">
                  Sem Padronização
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
