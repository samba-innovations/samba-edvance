import Link from "next/link";
import { AlertCircle } from "lucide-react";

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/imgs/edvance-logotipo.svg"
            alt="Samba Edvance"
            className="h-10 w-auto mx-auto dark:hidden"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/imgs/edvance-logotipo2.svg"
            alt="Samba Edvance"
            className="h-10 w-auto mx-auto hidden dark:block"
          />
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-xl shadow-black/5">
          <h1 className="text-xl font-black text-foreground text-center mb-1">
            Acesso restrito
          </h1>
          <p className="text-sm text-muted-foreground text-center mb-6">
            O acesso ao Samba Edvance é feito via SSO.
          </p>

          <div className="flex items-start gap-3 bg-muted/40 border border-border rounded-xl p-4">
            <AlertCircle size={16} className="text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Para acessar a plataforma, faça login no{" "}
              <strong className="text-foreground">Samba Access</strong> e clique
              em <em>Samba Edvance</em> no painel de sistemas.
            </p>
          </div>

          <div className="mt-6 text-center">
            <a
              href={`${process.env.NEXT_PUBLIC_URL_ACCESS ?? "http://localhost:3002"}`}
              className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"
            >
              Ir para o Samba Access →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
