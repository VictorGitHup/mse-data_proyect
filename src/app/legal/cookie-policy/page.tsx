
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Cookie, Info, Settings, FileText, GanttChartSquare, Layers, Clock, CheckCircle, ExternalLink } from "lucide-react"

export const metadata = {
  title: 'Política de Cookies',
};

const ownCookies = [
    { name: "PHPSESSID", purpose: "Gestionar la sesión de usuario y la navegación en el sitio. Esencial.", expiry: "Al cerrar el navegador" },
    { name: "_mayoriadeedad", purpose: "Verificar y recordar la aceptación de la declaración de mayoría de edad.", expiry: "5 días" },
    { name: "_uecookie", purpose: "Guardar su preferencia de consentimiento de cookies.", expiry: "5 días" },
    { name: "__me", purpose: "Gestionar la sesión del usuario registrado (si aplica).", expiry: "1 año" },
    { name: "_userPanel", purpose: "Mantener la sesión de acceso al área de usuario (panel).", expiry: "1 día" },
    { name: "ck__gsap", purpose: "Controlar la visualización de mensajes informativos en listados.", expiry: "2 horas" },
    { name: "formCookie", purpose: "Facilitar el funcionamiento técnico del formulario de gestión de cookies.", expiry: "Durante la visita" },
];

const thirdPartyCookies = [
    { name: "_ga", purpose: "Diferenciar usuarios únicos.", expiry: "2 años" },
    { name: "ga_<container-id>", purpose: "Mantener el estado de la sesión para el análisis.", expiry: "2 años" },
];

export default function CookiePolicyPage() {
  return (
    <div className="space-y-8">
      <header className="text-center">
        <h1 className="text-4xl font-bold tracking-tighter flex items-center justify-center gap-3">
            <Cookie className="h-9 w-9" />
            Política de Cookies
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Última modificación: 7 de enero de 2026
        </p>
      </header>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Información General</AlertTitle>
        <AlertDescription>
          MiEscortErotica (en adelante, "el Sitio Web") informa a los usuarios sobre el uso de cookies. El acceso está restringido a personas mayores de 18 años.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText />
            ¿Qué son las Cookies?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Las cookies son pequeños archivos de texto que se descargan en su dispositivo (ordenador, tableta, smartphone) cuando visita un sitio web. Son herramientas fundamentales para la prestación de numerosos servicios en línea. Permiten, entre otras funciones, recordar preferencias, analizar el tráfico del sitio y mejorar la experiencia del usuario.
          </p>
        </CardContent>
      </Card>
      
      <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
        <AccordionItem value="item-1">
          <AccordionTrigger className="text-lg font-semibold">
            <div className="flex items-center gap-2">
              <GanttChartSquare />
              Tipos y Detalles de las Cookies Utilizadas
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2 space-y-6">
            <div>
                <h4 className="font-semibold text-base mb-2">Clasificación de Cookies</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-3 border rounded-lg">
                        <h5 className="font-semibold flex items-center gap-1.5"><Layers className="h-4 w-4"/>Por Entidad</h5>
                        <p className="text-xs text-muted-foreground mt-1">Propias (gestionadas por nosotros) o de Terceros (proveedores externos).</p>
                    </div>
                    <div className="p-3 border rounded-lg">
                        <h5 className="font-semibold flex items-center gap-1.5"><Clock className="h-4 w-4"/>Por Duración</h5>
                        <p className="text-xs text-muted-foreground mt-1">De Sesión (temporales) o Persistentes (duran un tiempo definido).</p>
                    </div>
                     <div className="p-3 border rounded-lg">
                        <h5 className="font-semibold flex items-center gap-1.5"><Settings className="h-4 w-4"/>Por Finalidad</h5>
                        <p className="text-xs text-muted-foreground mt-1">Técnicas, de Preferencias o de Análisis.</p>
                    </div>
                </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-base mb-2">Cookies Propias (Esenciales y de Funcionalidad)</h4>
                <div className="border rounded-lg overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Finalidad</TableHead>
                                <TableHead className="text-right">Caducidad</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {ownCookies.map(cookie => (
                                <TableRow key={cookie.name}>
                                    <TableCell className="font-mono text-xs">{cookie.name}</TableCell>
                                    <TableCell className="text-sm">{cookie.purpose}</TableCell>
                                    <TableCell className="text-right text-sm">{cookie.expiry}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>

             <div>
              <h4 className="font-semibold text-base mb-2">Cookies de Terceros (Análisis)</h4>
              <p className="text-sm text-muted-foreground mb-4">Utilizamos Google Analytics para análisis estadístico anónimo con la función `anonymizeIp` activada. La información recopilada no identifica usuarios individuales.</p>
                <div className="border rounded-lg overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Finalidad (Proveedor: Google Analytics)</TableHead>
                                <TableHead className="text-right">Caducidad</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {thirdPartyCookies.map(cookie => (
                                <TableRow key={cookie.name}>
                                    <TableCell className="font-mono text-xs">{cookie.name}</TableCell>
                                    <TableCell className="text-sm">{cookie.purpose}</TableCell>
                                    <TableCell className="text-right text-sm">{cookie.expiry}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>

          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-2">
          <AccordionTrigger className="text-lg font-semibold">
            <div className="flex items-center gap-2">
              <Settings />
               Gestión de Cookies y Consentimiento
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2 space-y-4">
             <div>
                <h4 className="font-semibold">Panel de Configuración</h4>
                <p className="text-muted-foreground">Puede gestionar sus preferencias de cookies (aceptar, rechazar o personalizar) en cualquier momento mediante el panel de configuración disponible en el pie de página del Sitio Web.</p>
             </div>
             <div>
                <h4 className="font-semibold">Configuración del Navegador</h4>
                <p className="text-muted-foreground mb-2">También puede permitir, bloquear o eliminar las cookies instaladas configurando las opciones de su navegador. A continuación, las guías oficiales:</p>
                <div className="flex flex-wrap gap-2">
                    <a href="#" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm inline-flex items-center gap-1">Google Chrome <ExternalLink className="h-3 w-3"/></a>
                    <a href="#" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm inline-flex items-center gap-1">Mozilla Firefox <ExternalLink className="h-3 w-3"/></a>
                    <a href="#" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm inline-flex items-center gap-1">Safari <ExternalLink className="h-3 w-3"/></a>
                    <a href="#" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm inline-flex items-center gap-1">Microsoft Edge <ExternalLink className="h-3 w-3"/></a>
                </div>
             </div>
             <div>
                <h4 className="font-semibold">Consecuencias de la Desactivación</h4>
                <p className="text-muted-foreground">La desactivación de las cookies técnicas o esenciales puede impedir el correcto funcionamiento del Sitio Web. El bloqueo de cookies de análisis no afectará a su navegación.</p>
             </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Card className="border-primary">
         <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle />
              Aceptación y Actualizaciones
            </CardTitle>
         </CardHeader>
         <CardContent className="space-y-4">
            <p className="text-muted-foreground">
            Al utilizar el Sitio Web y hacer clic en "Aceptar" en nuestro banner de cookies, usted consiente el uso de las cookies según lo descrito. Si modifica su configuración desde el panel, debe actualizar la página (F5) para que los cambios surtan efecto.
            </p>
             <p className="text-muted-foreground">
            Nos reservamos el derecho a modificar esta Política para adaptarla a novedades legislativas o cambios técnicos. Para cualquier duda, contáctenos a través de los canales en nuestra Política de Privacidad.
            </p>
         </CardContent>
      </Card>
    </div>
  );
}
