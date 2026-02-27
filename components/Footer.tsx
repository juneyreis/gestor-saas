import React from 'react';
import { Hexagon, Twitter, Linkedin, Github } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-nexus-900 border-t border-nexus-800 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <Hexagon className="w-6 h-6 text-nexus-accent" strokeWidth={1.5} />
              <span className="font-mono font-bold text-lg text-white">GESTOR CRM</span>
            </div>
            <p className="text-nexus-muted text-sm leading-relaxed">
              O sistema de gestão definitivo para prospecção, controle de visitas, agenda e inteligência na venda ativa.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Produto</h4>
            <ul className="space-y-2 text-sm text-nexus-muted">
              <li><a href="#" className="hover:text-nexus-accent transition-colors">Field Maps</a></li>
              <li><a href="#" className="hover:text-nexus-accent transition-colors">CRM Sync</a></li>
              <li><a href="#" className="hover:text-nexus-accent transition-colors">Changelog</a></li>
              <li><a href="#" className="hover:text-nexus-accent transition-colors">Docs</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Empresa</h4>
            <ul className="space-y-2 text-sm text-nexus-muted">
              <li><a href="#" className="hover:text-nexus-accent transition-colors">Sobre Nós</a></li>
              <li><a href="#" className="hover:text-nexus-accent transition-colors">Carreiras</a></li>
              <li><a href="#" className="hover:text-nexus-accent transition-colors">Legal</a></li>
              <li><a href="#" className="hover:text-nexus-accent transition-colors">Contato</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Social</h4>
            <div className="flex space-x-4">
              <a href="#" className="text-nexus-muted hover:text-nexus-accent transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-nexus-muted hover:text-nexus-accent transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="#" className="text-nexus-muted hover:text-nexus-accent transition-colors">
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-nexus-800 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-nexus-muted">
          <p>&copy; {new Date().getFullYear()} Topteam Tecnologia. Todos os direitos reservados.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="hover:text-white">Privacidade</a>
            <a href="#" className="hover:text-white">Termos de Uso</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;