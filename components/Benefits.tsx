"use client";

import { motion } from "framer-motion";
import { Building2, GraduationCap, UsersRound, Check } from "lucide-react";

export function Benefits() {
  const cases = [
    {
      target: "Para Escolas e Parceiros",
      icon: Building2,
      points: ["Padronização de avaliações em toda a rede escolar", "Dados consolidados por unidade para comparação justa", "Subsídio para políticas pedagógicas baseadas em evidências"],
      bg: "bg-blue-50 dark:bg-blue-500/10",
      color: "text-blue-600 dark:text-blue-400",
      border: "hover:border-blue-400/50"
    },
    {
      target: "Para Professores",
      icon: GraduationCap,
      points: ["Banco de questões pronto para reutilizar e colaborar", "Criação de simulados em minutos, não em horas", "Feedback automático sobre o desempenho da turma"],
      bg: "bg-emerald-50 dark:bg-emerald-500/10",
      color: "text-emerald-600 dark:text-emerald-400",
      border: "hover:border-emerald-400/50"
    },
    {
      target: "Para Gestores e Direção",
      icon: UsersRound,
      points: ["Visão comparativa de desempenho entre turmas e escolas", "Identificação dos conteúdos críticos em toda a rede", "Relatórios prontos para apresentação à secretaria"],
      bg: "bg-teal-50 dark:bg-teal-500/10",
      color: "text-primary dark:text-teal-400",
      border: "hover:border-primary/50"
    }
  ];

  return (
    <section id="beneficios" className="py-24 bg-muted/30 border-t border-border/50">
      <div className="container mx-auto px-6 lg:px-12">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-extrabold text-foreground mb-6"
          >
            Benefícios para Toda a Rede
          </motion.h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {cases.map((bnf, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`p-8 rounded-[2rem] bg-card border border-border shadow-md transition-all duration-300 ${bnf.border} hover:shadow-xl`}
            >
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-8 ${bnf.bg}`}>
                <bnf.icon className={`w-8 h-8 ${bnf.color}`} />
              </div>
              <h3 className="text-2xl font-bold mb-6 text-foreground">{bnf.target}</h3>
              <ul className="space-y-4">
                {bnf.points.map((pt, j) => (
                  <li key={j} className="flex items-start gap-3 text-muted-foreground font-medium">
                    <div className={`mt-0.5 p-1 rounded-full ${bnf.bg} shrink-0`}>
                      <Check size={14} className={bnf.color} strokeWidth={3} />
                    </div>
                    {pt}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
