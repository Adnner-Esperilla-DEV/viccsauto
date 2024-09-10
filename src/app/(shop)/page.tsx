import { ProductGrid, Title } from "@/components";
import { titleFont } from "@/config/fonts";
import { initialData } from "@/seed/seed";
import Image from "next/image";
import { IoLocate, IoLocationSharp, IoLogoWhatsapp } from "react-icons/io5";

const products = initialData.products;

export default function Home() {
  return (
    
    <>
    <div className="sticky-bottom-component">
      <div className="info">
        <IoLocationSharp className="icon" />
        <p>Benjamin Vicuña Mackenna 848, Arica, Chile</p>
      </div>
      <div className="info">
        <IoLogoWhatsapp className="icon" />
        <p>+56 953 819 066</p>
      </div>
    </div>
      <Title title="Tienda" subtitle="Todos los Productos"  className="mb-2" />

      <ProductGrid products={products} />
    </>
  );
}
