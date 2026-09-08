import type { Metadata } from "next";
import { CommercialPage } from "@/components/commercial/CommercialPage";
export const metadata: Metadata = { title: "Nosotros" };
export default function Page() {
  return (
    <CommercialPage eyebrow="ViccsAuto" title="Especialistas automotrices en Arica">
      <p>Seleccionamos autopartes, repuestos y vehículos con información clara y acompañamiento local.</p>
      <p>
        Nuestra prioridad es que cada cliente reciba la pieza correcta. Por eso publicamos códigos OEM y
        compatibilidades, y recomendamos validar con VIN cuando corresponda.
      </p>
    </CommercialPage>
  );
}
