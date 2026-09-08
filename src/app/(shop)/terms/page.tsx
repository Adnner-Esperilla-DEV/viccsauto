import type { Metadata } from "next";

import { CommercialPage } from "@/components/commercial/CommercialPage";

export const metadata: Metadata = { title: "Términos y condiciones" };

export default function Page() {
  return (
    <CommercialPage eyebrow="Legal" title="Términos y condiciones">
      <p>
        Los precios se expresan en pesos chilenos. Las ventas y entregas en Arica no agregan tributos de internación.
        Los envíos fuera de Arica e Iquique incorporan en el checkout una estimación de los tributos aplicables según el
        destino.
      </p>
      <p>
        El transporte fuera de Arica se paga en destino directamente al transportista y no forma parte del total cobrado
        por ViccsAuto. Todo pedido queda sujeto a confirmación de stock y pago; el modo manual no implica que el pago
        esté aprobado.
      </p>
      <p>
        Las compatibilidades son referencias técnicas y deben validarse con los datos completos del vehículo. Los
        vehículos se cotizan y reservan fuera del carrito de repuestos.
      </p>
    </CommercialPage>
  );
}
