"use client";

import { motion } from "framer-motion";
import { Play } from "lucide-react";

export function Demo() {
  return (
    <section id="demonstracao" className="py-24 bg-primary/5 dark:bg-primary/10 relative">
      <div className="container mx-auto px-6 lg:px-12">
        <div className="flex flex-col lg:flex-row gap-12 items-center">
          <div className="lg:w-1/2">
            <motion.h2
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-5xl font-extrabold text-foreground mb-6"
            >
              Veja o <span className="text-primary dark:text-cyan-400">samba edvance</span> em Ação
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-lg text-muted-foreground mb-8"
            >
              Conheça a interface de criação de simulados e veja como a análise de resultados se torna instantânea, comparativa e acionável.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <a
                href="#contato"
                className="inline-block bg-foreground text-background hover:bg-foreground/90 px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-lg w-full sm:w-auto text-center"
              >
                Solicitar Demonstração Rápida
              </a>
            </motion.div>
          </div>

          <div className="lg:w-1/2 w-full">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative w-full aspect-video rounded-3xl bg-slate-900 border-4 border-slate-800 shadow-2xl flex items-center justify-center overflow-hidden group cursor-pointer"
            >
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070')] bg-cover opacity-30 mix-blend-overlay group-hover:opacity-40 transition-opacity"></div>

              <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center text-white pl-1 shadow-xl shadow-primary/30 group-hover:scale-110 transition-transform">
                <Play size={36} fill="currentColor" />
              </div>

              <div className="absolute bottom-6 left-6 right-6">
                <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-1/4"></div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
