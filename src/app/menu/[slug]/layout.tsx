// Layout público do QR Menu — sem sidebar, sem auth admin
// Otimizado para mobile (tela do cliente)
export const metadata = {
  title: "Cardápio",
  description: "Faça seu pedido diretamente pela mesa.",
};

export default function MenuLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {children}
    </div>
  );
}
