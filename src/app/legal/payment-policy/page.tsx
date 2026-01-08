
export const metadata = {
  title: 'Política de Pagos y Reembolsos',
};

export default function PaymentPolicyPage() {
  return (
    <>
      <h1>Política de Pagos y Reembolsos</h1>
      <p className="lead">Última actualización: 7 de enero de 2026</p>

      <p>Esta política describe los términos relacionados con los pagos por servicios premium, como la función "Destacar Anuncio", en MiPlataforma.</p>

      <h2>1. Servicios de Pago</h2>
      <p>Ofrecemos servicios opcionales de pago, como la capacidad de "destacar" un anuncio para aumentar su visibilidad. Los precios y la duración de estos servicios se indicarán claramente en el momento de la compra.</p>
      <p>Todos los pagos se procesan a través de un proveedor de pasarela de pago seguro de terceros (por ejemplo, Stripe, PayPal). No almacenamos la información completa de tu tarjeta de crédito en nuestros servidores.</p>
      
      <h2>2. Proceso de Pago</h2>
      <p>Al comprar un servicio, se te pedirá que proporciones información de pago. Declaras y garantizas que tienes el derecho legal de utilizar cualquier método de pago que utilices. Al enviar dicha información, nos otorgas el derecho de proporcionar la información a terceros para facilitar la finalización de las compras.</p>

      <h2>3. Política de Reembolsos</h2>
      <p><strong>Todos los pagos por servicios digitales, incluyendo pero no limitado a destacar anuncios, son finales y no reembolsables.</strong></p>
      <p>Una vez que un anuncio ha sido destacado, el servicio se considera consumido. No se emitirán reembolsos ni créditos por períodos de destaque parciales, eliminaciones de anuncios por parte del usuario o suspensiones de cuenta debido a la violación de nuestros Términos de Uso.</p>
      <p>La única excepción a esta política es si MiPlataforma no puede proporcionar el servicio adquirido debido a un error técnico de nuestra parte. En tales casos, investigaremos el problema y, a nuestra discreción, podremos ofrecer un crédito o un reembolso.</p>

      <h2>4. Disputas</h2>
      <p>Si tienes una disputa sobre un cargo, te pedimos que te pongas en contacto con nuestro equipo de soporte primero para intentar resolver el problema. Iniciar una devolución de cargo (chargeback) sin contactarnos primero puede resultar en la suspensión permanente de tu cuenta.</p>
    </>
  );
}
