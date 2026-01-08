
import Link from 'next/link';

const footerLinks = {
  legal: [
    { name: 'Política de Privacidad', href: '/legal/privacy-policy' },
    { name: 'Condiciones de Uso', href: '/legal/terms-of-use' },
    { name: 'Política de Cookies', href: '/legal/cookie-policy' },
  ],
  support: [
    { name: 'Política de Pagos y Reembolsos', href: '/legal/payment-policy' },
    { name: 'Control Parental', href: '/legal/parental-control' },
    { name: 'Contacto', href: '/legal/contact' },
  ],
};

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-card border-t mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-2">
            <Link href="/" className="font-bold text-xl">
              MiPlataforma
            </Link>
            <p className="text-sm text-muted-foreground">
              Tu portal de anuncios clasificados de confianza.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 md:col-span-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground tracking-wider uppercase">Legal</h3>
              <ul className="mt-4 space-y-2">
                {footerLinks.legal.map((link) => (
                  <li key={link.name}>
                    <Link href={link.href} className="text-sm text-muted-foreground hover:text-primary">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground tracking-wider uppercase">Soporte y Seguridad</h3>
              <ul className="mt-4 space-y-2">
                {footerLinks.support.map((link) => (
                  <li key={link.name}>
                    <Link href={link.href} className="text-sm text-muted-foreground hover:text-primary">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-8 border-t pt-4 text-center text-sm text-muted-foreground">
          <p>&copy; {currentYear} MiPlataforma. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
