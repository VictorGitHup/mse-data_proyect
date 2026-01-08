
export const metadata = {
  title: 'Contacto',
};

export default function ContactPage() {
  return (
    <>
      <h1>Contacto</h1>
      <p className="lead">¿Tienes preguntas, sugerencias o necesitas reportar un problema?</p>

      <p>La mejor manera de ponerte en contacto con el equipo de MiPlataforma es a través de nuestro correo electrónico de soporte. Nos esforzamos por responder a todas las consultas en un plazo de 24-48 horas hábiles.</p>

      <h2>Correo Electrónico de Soporte</h2>
      <p>Para todas las consultas, incluyendo soporte técnico, preguntas sobre pagos, reportes de contenido o violaciones de los términos, por favor, escríbenos a:</p>
      <p><a href="mailto:soporte@miplataforma.com" className="font-semibold text-primary"><strong>soporte@miplataforma.com</strong></a></p>
      
      <h2>Información a Incluir</h2>
      <p>Para ayudarnos a resolver tu problema lo más rápido posible, por favor incluye la siguiente información en tu correo electrónico:</p>
      <ul>
        <li>Tu nombre de usuario en MiPlataforma (si aplica).</li>
        <li>Una descripción detallada de tu pregunta o problema.</li>
        <li>Enlaces (URLs) a los anuncios o perfiles relevantes, si aplica.</li>
        <li>Capturas de pantalla del problema, si es posible.</li>
      </ul>

      <h2>Reportes de Seguridad y Abuso</h2>
      <p>Si estás reportando un problema de seguridad, contenido ilegal o cualquier forma de abuso, por favor, indica "REPORTE URGENTE" en el asunto de tu correo para que podamos priorizar tu solicitud.</p>

      <p>Agradecemos tu paciencia y cooperación.</p>
    </>
  );
}
