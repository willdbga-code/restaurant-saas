import Link from "next/link";
import { ChefHat, ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Política de Privacidade — RestaurantOS",
  description: "Política de privacidade e proteção de dados da plataforma RestaurantOS.",
};

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-3xl px-6 py-20">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors mb-12">
          <ArrowLeft className="h-4 w-4" /> Voltar ao início
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <ChefHat className="h-8 w-8 text-orange-500" />
          <h1 className="text-3xl font-black tracking-tight">Política de Privacidade</h1>
        </div>
        
        <p className="text-sm text-zinc-500 mb-12">Última atualização: Maio de 2026</p>

        <div className="prose prose-invert prose-zinc max-w-none space-y-8 text-zinc-300 leading-relaxed text-sm">
          <section>
            <h2 className="text-xl font-bold text-white mb-4">1. Dados Coletados</h2>
            <p>
              A plataforma RestaurantOS coleta os seguintes tipos de dados:
            </p>
            <ul className="list-disc list-inside space-y-2 mt-3 text-zinc-400">
              <li><strong className="text-zinc-300">Dados de cadastro:</strong> nome, email, nome do restaurante.</li>
              <li><strong className="text-zinc-300">Dados operacionais:</strong> produtos, categorias, pedidos, mesas.</li>
              <li><strong className="text-zinc-300">Dados de clientes finais:</strong> nome informado ao acessar o cardápio (usado apenas para identificação do pedido na cozinha).</li>
              <li><strong className="text-zinc-300">Dados técnicos:</strong> logs de acesso, endereço IP, tipo de dispositivo.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">2. Uso dos Dados</h2>
            <p>
              Os dados coletados são utilizados exclusivamente para:
            </p>
            <ul className="list-disc list-inside space-y-2 mt-3 text-zinc-400">
              <li>Prestar e melhorar os serviços da plataforma.</li>
              <li>Gerar relatórios financeiros e operacionais para o restaurante.</li>
              <li>Enviar comunicações relevantes sobre o serviço.</li>
              <li>Garantir a segurança e integridade da plataforma.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">3. Armazenamento e Segurança</h2>
            <p>
              Os dados são armazenados em servidores seguros do Google Cloud Platform (Firebase). 
              Utilizamos criptografia em trânsito (TLS/SSL) e controles de acesso rigorosos 
              baseados em roles (RBAC) para proteger as informações.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">4. Compartilhamento</h2>
            <p>
              Não vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros, 
              exceto quando necessário para o funcionamento do serviço (processadores de pagamento) 
              ou quando exigido por lei.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">5. Isolamento Multi-Tenant</h2>
            <p>
              Cada restaurante opera em um ambiente logicamente isolado. 
              Os dados de um restaurante nunca são acessíveis por outro restaurante cadastrado na plataforma. 
              Este isolamento é garantido por regras de segurança no nível do banco de dados.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">6. Direitos do Titular (LGPD)</h2>
            <p>
              Em conformidade com a Lei Geral de Proteção de Dados (LGPD), você tem direito a:
            </p>
            <ul className="list-disc list-inside space-y-2 mt-3 text-zinc-400">
              <li>Acessar seus dados pessoais armazenados.</li>
              <li>Corrigir dados incompletos ou desatualizados.</li>
              <li>Solicitar a exclusão de seus dados.</li>
              <li>Revogar o consentimento para o tratamento de dados.</li>
              <li>Solicitar a portabilidade dos dados.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">7. Cookies</h2>
            <p>
              Utilizamos cookies e tecnologias similares (localStorage) para manter sua sessão 
              ativa e melhorar a experiência de uso. Você pode desabilitar cookies nas configurações 
              do seu navegador, mas isso pode afetar o funcionamento da plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">8. Contato do DPO</h2>
            <p>
              Para exercer seus direitos ou tirar dúvidas sobre esta política, entre em contato: <span className="text-orange-400">privacidade@restaurantos.com.br</span>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
