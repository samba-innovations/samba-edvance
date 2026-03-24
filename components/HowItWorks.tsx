"use client";

import { motion } from "framer-motion";
import { Edit3, UserPlus, ClipboardCheck, BarChart3 } from "lucide-react";

export function HowItWorks() {
  const tutorial = [
    { title: "Banco de Questões", desc: "Professor cadastra ou seleciona questões por disciplina, ano e nível de dificuldade.", icon: Edit3 },
    { title: "Montagem", desc: "Simulado configurado em minutos com gabarito automático e layout padronizado.", icon: ClipboardCheck },
    { title: "Aplicação", desc: "Turmas recebem o simulado digital ou em PDF imprimível com um clique.", icon: UserPlus },
    { title: "Análise", desc: "Resultados processados com ranking, médias, mapa de erros e evolução histórica.", icon: BarChart3 }
  ];

  return (
    <section id="comofunciona" className="py-24 bg-background">
      <div className="container mx-auto px-6 lg:px-12">
        <div className="mb-16">
          <h2 className="text-3xl md:text-5xl font-extrabold text-foreground mb-4">Como Funciona na Prática</h2>
          <p className="text-lg text-muted-foreground max-w-2xl">Do banco de questões ao relatório de desempenho, tudo em um fluxo simples e integrado.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {tutorial.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="bg-card p-6 rounded-3xl border border-border shadow-sm flex flex-col items-center text-center hover:border-primary/40 transition-colors group"
            >
              <div className="w-full aspect-video bg-muted rounded-2xl mb-6 relative overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors"></div>
                <item.icon size={48} className="text-primary/40" />
              </div>
              <h4 className="text-lg font-bold text-foreground mb-2">{i+1}. {item.title}</h4>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
