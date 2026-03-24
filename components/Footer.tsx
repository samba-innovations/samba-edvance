import Image from "next/image";
import { ArrowRight } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative bg-background pt-24 pb-12 px-6 lg:px-12 border-t border-border/50 overflow-hidden mt-12">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-px bg-linear-to-r from-transparent via-primary/40 to-transparent"></div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-150 h-75 bg-primary/10 blur-[130px] rounded-full pointer-events-none -z-10"></div>

      <div className="container mx-auto">
        {/* Pre-footer CTA */}
        <div className="flex flex-col md:flex-row items-center justify-between bg-card/40 border border-border/50 p-10 lg:p-14 rounded-[2.5rem] mb-20 shadow-xl relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-secondary/10 blur-[80px] rounded-full pointer-events-none"></div>
          <div className="relative z-10 md:w-2/3 mb-8 md:mb-0">
            <h3 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4">Pronto para elevar o nível das suas avaliações?</h3>
            <p className="text-muted-foreground text-lg max-w-xl">
              Junte-se às instituições que já padronizaram seus simulados e transformam resultados em aprendizado de qualidade.
            </p>
          </div>
          <button className="relative z-10 shrink-0 bg-foreground text-background hover:scale-105 transition-transform px-8 py-4 rounded-full font-bold flex items-center gap-3 shadow-lg w-full md:w-auto justify-center">
            Falar com Consultor <ArrowRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-8 mb-16">
          {/* Brand Column */}
          <div className="md:col-span-5 lg:col-span-4 pr-0 lg:pr-12">
            <div className="mb-6">
              <Image
                src="/imgs/innvtns-logotipo.svg"
                alt="Logo Samba Innovations"
                width={160}
                height={40}
                className="h-9 w-auto object-contain dark:hidden"
                priority
              />
              <Image
                src="/imgs/innvtns-logotipo2.svg"
                alt="Logo Samba Innovations"
                width={160}
                height={40}
                className="h-9 w-auto object-contain hidden dark:block"
                priority
              />
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed mb-8">
              A samba innovations resolve processos educacionais complexos através de tecnologia inteligente, construindo a ponte perfeita entre professores, coordenação pedagógica e a comunidade escolar.
            </p>
            <div className="flex items-center gap-4 text-muted-foreground">
              <a href="https://www.instagram.com/sambainnovations/" className="p-3 rounded-full bg-muted/50 hover:bg-primary/20 hover:text-primary transition-all duration-300 hover:-translate-y-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
              </a>
              <a href="https://www.linkedin.com/company/samba-innovations/" className="p-3 rounded-full bg-muted/50 hover:bg-primary/20 hover:text-primary transition-all duration-300 hover:-translate-y-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
              </a>
              <a href="https://twitter.com/sambainnovations" className="p-3 rounded-full bg-muted/50 hover:bg-primary/20 hover:text-primary transition-all duration-300 hover:-translate-y-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
            </div>
          </div>

          {/* Links Columns */}
          <div className="md:col-span-7 lg:col-span-8 grid grid-cols-2 lg:grid-cols-3 gap-8">
            <div>
              <h4 className="font-bold text-foreground mb-6">Produto</h4>
              <ul className="space-y-4 text-sm text-muted-foreground">
                <li><a href="#solucao" className="hover:text-primary hover:tracking-wide transition-all duration-300 inline-block">Funcionalidades</a></li>
                <li><a href="#beneficios" className="hover:text-primary hover:tracking-wide transition-all duration-300 inline-block">Benefícios</a></li>
                <li><a href="#comofunciona" className="hover:text-primary hover:tracking-wide transition-all duration-300 inline-block">Como Funciona</a></li>
                <li><a href="#demonstracao" className="hover:text-primary hover:tracking-wide transition-all duration-300 inline-block">Ver Demonstração</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-foreground mb-6">Institucional</h4>
              <ul className="space-y-4 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary hover:tracking-wide transition-all duration-300 inline-block">Sobre a Empresa</a></li>
                <li><a href="#" className="hover:text-primary hover:tracking-wide transition-all duration-300 inline-block">Casos de Sucesso</a></li>
                <li><a href="#contato" className="hover:text-primary hover:tracking-wide transition-all duration-300 inline-block">Fale Conosco</a></li>
                <li><a href="#" className="hover:text-primary hover:tracking-wide transition-all duration-300 inline-block">Trabalhe Conosco</a></li>
              </ul>
            </div>

            <div className="col-span-2 lg:col-span-1">
              <h4 className="font-bold text-foreground mb-6">Legal</h4>
              <ul className="space-y-4 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary hover:tracking-wide transition-all duration-300 inline-block">Política de Privacidade</a></li>
                <li><a href="#" className="hover:text-primary hover:tracking-wide transition-all duration-300 inline-block">Termos de Uso</a></li>
                <li><a href="#" className="hover:text-primary hover:tracking-wide transition-all duration-300 inline-block">Conformidade LGPD</a></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center text-xs lg:text-sm text-muted-foreground/50 border-t border-border/40 pt-8 mt-8">
          <div>
            © {new Date().getFullYear()} samba innovations. Todos os direitos reservados.
          </div>
          <div className="mt-4 md:mt-0 flex items-center gap-2 bg-muted/30 px-3 py-1.5 rounded-full">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></div>
            <span>Status do Sistema: <span className="text-foreground/80 font-medium">Operacional</span></span>
          </div>
        </div>
      </div>
    </footer>
  );
}
