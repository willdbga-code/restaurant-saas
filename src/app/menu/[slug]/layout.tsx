// Layout público do QR Menu — sem sidebar, sem auth admin
// Otimizado para mobile (tela do cliente)

import type { Metadata } from "next";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const displayName = slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    title: `${displayName} — Cardápio Digital | RestaurantOS`,
    description: `Veja o cardápio de ${displayName} e faça seu pedido diretamente pela mesa.`,
    openGraph: {
      title: `${displayName} — Cardápio Digital`,
      description: `Peça diretamente pelo cardápio digital de ${displayName}.`,
      type: "website",
    },
  };
}

export default function MenuLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {children}
    </div>
  );
}
