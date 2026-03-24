"use client";

import { motion } from "framer-motion";
import { ListChecks, UserCheck, Activity, BrainCircuit, Users } from "lucide-react";

export function Solution() {
  const steps = [
    { num: "01", title: "Criar", desc: "O professor monta o simulado selecionando questões do banco compartilhado por disciplina, ano e dificuldade.", icon: ListChecks },
    { num: "02", title: "Distribuir", desc: "A coordenação publica o simulado para turmas específicas com um clique, em formato digital ou imprimível.", icon: Activity },
    { num: "03", title: "Analisar", desc: "Os resultados são processados automaticamente, gerando relatórios de desempenho por aluno, turma e conteúdo.", icon: UserCheck }
  ];

  return (
    <section id="solucao" className="py-24 bg-background relative overflow-hidden">
      <div className="absolute -left-1/4 top-1/4 w-1/2 h-1/2 bg-primary/10 rounded-full blur-[150px] -z-10"></div>

      <div className="container mx-auto px-6 lg:px-12 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-sm font-bold text-primary tracking-widest uppercase mb-3"
          >
            A Solução samba edvance
          </motion.h2>
          <motion.h3
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-5xl font-extrabold text-foreground mb-6"
          >
            Padronizando Avaliações na Rede Escolar
          </motion.h3>
        </div>

        {/* 3 Step Flow */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-28 relative">
          <div className="hidden md:block absolute top-12 left-[18%] right-[18%] h-0.5 bg-gradient-to-r from-primary/5 via-primary to-primary/5 z-0"></div>

          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2 }}
              className="relative z-10 flex flex-col items-center text-center group"
            >
              <div className="w-24 h-24 rounded-3xl bg-card border-2 border-primary/20 shadow-xl flex items-center justify-center mb-6 relative group-hover:scale-110 group-hover:bg-primary group-hover:border-primary transition-all duration-300">
                <step.icon size={36} className="text-primary group-hover:text-white transition-colors" />
                <div className="absolute -top-4 -right-4 w-10 h-10 rounded-full bg-secondary text-white font-black flex items-center justify-center border-4 border-background shadow-sm">
                  {step.num}
                </div>
              </div>
              <h4 className="text-2xl font-bold text-foreground mb-3">{step.title}</h4>
              <p className="text-muted-foreground leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Key Features List */}
        <div className="grid md:grid-cols-2 gap-12 items-center bg-card rounded-[2.5rem] p-8 md:p-14 border border-border shadow-2xl relative overflow-hidden">
          <div className="absolute right-0 bottom-0 w-64 h-64 bg-secondary/10 rounded-tl-full -z-10"></div>

          <div>
            <h4 className="text-3xl font-extrabold mb-8 text-foreground">Tudo em um só lugar</h4>
            <ul className="space-y-5">
              {[
                "Banco de questões colaborativo, categorizado por disciplina e dificuldade.",
                "Gabarito automático e correção instantânea dos simulados.",
                "Relatórios de desempenho por aluno, turma e unidade escolar.",
                "Histórico longitudinal de evolução de cada estudante.",
                "Identificação automática dos conteúdos com maior índice de erro."
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                  </div>
                  <span className="text-foreground font-medium text-lg">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-4 h-full">
            <div className="bg-primary/5 p-8 rounded-3xl border border-primary/10 text-center flex flex-col justify-center transition-all hover:bg-primary/10 hover:-translate-y-1">
              <BrainCircuit size={40} className="mx-auto text-primary mb-4" />
              <div className="font-bold text-xl text-foreground">Inteligência</div>
              <div className="text-sm text-muted-foreground mt-2">Visão macro preventiva</div>
            </div>
            <div className="bg-secondary/10 p-8 rounded-3xl border border-secondary/20 text-center mt-12 flex flex-col justify-center transition-all hover:bg-secondary/20 hover:-translate-y-1">
              <Users size={40} className="mx-auto text-secondary mb-4" />
              <div className="font-bold text-xl text-foreground">Padronização</div>
              <div className="text-sm text-muted-foreground mt-2">Toda a rede alinhada</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
