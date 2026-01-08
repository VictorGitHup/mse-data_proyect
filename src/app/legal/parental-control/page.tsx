
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ShieldCheck, BookOpenCheck, ToyBrick, ListChecks, Link, Info } from "lucide-react"

export const metadata = {
  title: 'Control Parental y Seguridad',
};

export default function ParentalControlPage() {
  return (
    <div className="space-y-8">
      <header className="text-center">
        <h1 className="text-4xl font-bold tracking-tighter">Control Parental y Seguridad</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Nuestro compromiso con la protección del menor.
        </p>
      </header>
      
      <Alert>
        <ShieldCheck className="h-4 w-4" />
        <AlertTitle>Sitio Exclusivo para Mayores de Edad</AlertTitle>
        <AlertDescription>
          MiEscortErotica es un sitio web cuyo acceso está estrictamente limitado a personas mayores de 18 años.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks />
            Principios Fundamentales
          </CardTitle>
          <CardDescription>
            Las medidas que implementamos para un entorno más seguro.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold">Acceso Restringido</h3>
            <p className="text-muted-foreground">Verificamos la edad mediante declaración afirmativa durante el registro.</p>
          </div>
          <div>
            <h3 className="font-semibold">Etiquetado RTA (Restricted To Adults)</h3>
            <p className="text-muted-foreground">Nuestro sitio está etiquetado para ser reconocido y bloqueado por herramientas de control parental estándar.</p>
          </div>
          <div>
            <h3 className="font-semibold">Responsabilidad Parental</h3>
            <p className="text-muted-foreground">Instamos a padres y tutores a implementar activamente soluciones de filtrado en los dispositivos a los que los menores puedan tener acceso.</p>
          </div>
        </CardContent>
      </Card>
      
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="item-1">
          <AccordionTrigger className="text-lg font-semibold">
            <div className="flex items-center gap-2">
              <ToyBrick />
              Guía de Herramientas de Control Parental
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2 space-y-4">
            <p>Como apoyo a la labor de protección, proporcionamos información sobre herramientas disponibles:</p>
             <h4 className="font-semibold">1. Filtros en Motores de Búsqueda</h4>
            <p>Activar el "Modo Seguro" o "SafeSearch" ayuda a bloquear contenido para adultos en los resultados.</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Google SafeSearch: Configurable en cuentas individuales, navegadores y redes.</li>
              <li>Yahoo SafeSearch / Microsoft SafeSearch: Funciones similares en sus respectivos motores.</li>
              <li>Alternativas para niños: Motores de búsqueda diseñados para entornos seguros (ej., Kiddle, KidRex).</li>
            </ul>

            <h4 className="font-semibold">2. Controles Nativos en Sistemas Operativos</h4>
            <p>Todos los sistemas operativos principales ofrecen configuraciones nativas:</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Apple (iOS/macOS): Restringe contenido, apps y acceso web. <a href="https://support.apple.com/es-es/HT201304" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Guía para iPhone/iPad</a>.</li>
              <li>Android: El Centro de Seguridad Familiar de Google ofrece controles detallados.</li>
              <li>Microsoft Windows: Las "Opciones familiares" permiten crear cuentas infantiles con restricciones.</li>
              <li>Amazon Kids+: Ofrece controles para dispositivos Amazon.</li>
            </ul>

            <h4 className="font-semibold">3. Software Especializado</h4>
            <p>Soluciones de terceros que ofrecen filtrado avanzado. Opciones reconocidas: Qustodio, Net Nanny, Norton Family, Mobicip, SentryPC y Bark.</p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-2">
          <AccordionTrigger className="text-lg font-semibold">
            <div className="flex items-center gap-2">
              <BookOpenCheck />
               Recursos y Asociaciones de Protección
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2 space-y-4">
            <p>Colaboramos y apoyamos a organizaciones dedicadas a la seguridad en línea:</p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                <li><strong>ASACP (Adult Sites Against Child Pornography):</strong> Organización que combate la explotación infantil.</li>
                <li><strong>RTA Label:</strong> Sistema de etiquetado que facilita el bloqueo técnico de nuestro sitio. <a href="https://www.rtalabel.org/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Más información</a>.</li>
                <li><strong>Revenge Porn Helpline:</strong> Servicio de apoyo (UK) para víctimas de abuso por imágenes íntimas.</li>
            </ul>
            <h4 className="font-semibold mt-4">Para una Crianza Digital Informada</h4>
            <p>La educación es fundamental. Recomendamos estos recursos para profundizar en seguridad digital:</p>
             <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Family Online Safety Institute (FOSI)</li>
                <li>ConnectSafely / Internet Matters</li>
                <li>Better Internet for Kids (UE) / UK Safer Internet Centre</li>
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Card className="border-primary">
         <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info />
              Declaración Final de Cumplimiento
            </CardTitle>
         </CardHeader>
         <CardContent>
            <p className="text-muted-foreground">
            MiEscortErotica mantiene un compromiso permanente con el cumplimiento de las normativas de protección al menor. Implementamos y mantenemos activamente la compatibilidad técnica con el sistema RTA y otras medidas proactivas. La protección efectiva de los menores en el entorno digital requiere un esfuerzo conjunto entre proveedores de contenido, desarrolladores de tecnología, y especialmente, la supervisión activa de los padres y tutores.
            </p>
         </CardContent>
      </Card>
    </div>
  );
}
