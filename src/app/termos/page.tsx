import Link from "next/link";
import { ChefHat, ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Termos de Uso — RestaurantOS",
  description: "Termos e condições de uso da plataforma RestaurantOS.",
};

export default function TermosPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-3xl px-6 py-20">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors mb-12">
          <ArrowLeft className="h-4 w-4" /> Voltar ao início
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <ChefHat className="h-8 w-8 text-orange-500" />
          <h1 className="text-3xl font-black tracking-tight">Termos de Uso</h1>
        </div>
        
        <p className="text-sm text-zinc-500 mb-12">Última atualização: Maio de 2026</p>

        <div className="prose prose-invert prose-zinc max-w-none space-y-8 text-zinc-300 leading-relaxed text-sm">
          <section>
            <h2 className="text-xl font-bold text-white mb-4">1. Aceitação dos Termos</h2>
            <p>
              Ao acessar e utilizar a plataforma RestaurantOS, você concorda integralmente com estes Termos de Uso. 
              Caso não concorde com qualquer disposição, solicitamos que não utilize nossos serviços.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">2. Descrição do Serviço</h2>
            <p>
              O RestaurantOS é uma plataforma SaaS (Software as a Service) de gestão para restaurantes que oferece 
              cardápio digital, KDS (Kitchen Display System), gestão de mesas, pedidos e relatórios financeiros.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">3. Cadastro e Conta</h2>
            <p>
              O usuário é responsável por manter a confidencialidade de suas credenciais de acesso. 
              Toda atividade realizada sob sua conta é de sua responsabilidade. Caso identifique uso 
              não autorizado, entre em contato imediatamente com nosso suporte.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">4. Planos e Pagamentos</h2>
            <p>
              Os planos são cobrados conforme a periodicidade escolhida (mensal ou anual). 
              A não realização do pagamento pode resultar na suspensão temporária do acesso à plataforma. 
              Reembolsos seguem a política vigente no momento da contratação.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">5. Uso Aceitável</h2>
            <p>
              É proibido utilizar a plataforma para fins ilegais, fraudulentos ou que violem direitos de terceiros. 
              O RestaurantOS reserva-se o direito de suspender contas que violem estas diretrizes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">6. Propriedade Intelectual</h2>
            <p>
              Todo o conteúdo, design, código e marca RestaurantOS são propriedade exclusiva da empresa. 
              Os dados inseridos pelo usuário (produtos, cardápios, pedidos) permanecem como propriedade do usuário.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">7. Limitação de Responsabilidade</h2>
            <p>
              O RestaurantOS não se responsabiliza por perdas indiretas, incluindo lucros cessantes, 
              decorrentes do uso ou impossibilidade de uso da plataforma. Nosso serviço é fornecido 
              &quot;como está&quot; e &quot;conforme disponível&quot;.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">8. Contato</h2>
            <p>
              Para dúvidas sobre estes termos, entre em contato pelo email: <span className="text-orange-400">suporte@restaurantos.com.br</span>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
