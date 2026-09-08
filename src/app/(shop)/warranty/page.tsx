import type { Metadata } from "next";
import { CommercialPage } from "@/components/commercial/CommercialPage";
export const metadata: Metadata = { title: "Garantías" };
export default function Page() {
  return (
    <CommercialPage eyebrow="Postventa" title="Garantías">
      <p>
        La garantía cubre defectos de fabricación dentro del plazo informado en la ficha o comprobante. No cubre
        instalación incorrecta, uso inadecuado, desgaste normal ni incompatibilidad cuando se omitieron los datos
        solicitados.
      </p>
      <p>
        Conserva el comprobante y no intervengas la pieza si detectas una falla. Escríbenos con fotografías, descripción
        y datos del vehículo.
      </p>
    </CommercialPage>
  );
}
