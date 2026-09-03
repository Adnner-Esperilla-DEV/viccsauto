import Link from "next/link";
import { IoCarSportOutline, IoLocationOutline, IoSpeedometerOutline } from "react-icons/io5";
import type { VehicleListing } from "@/interfaces";
import { formatPrice } from "@/lib/format";

export function VehicleCard({ vehicle }: { vehicle: VehicleListing }) {
  return (
    <article className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-lg">
      <Link href={`/vehicle/${vehicle.slug}`} className="group block">
        {vehicle.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={vehicle.image} alt={`Portada de ${vehicle.year} ${vehicle.make} ${vehicle.model}`} className="aspect-[16/9] w-full bg-white object-cover transition duration-300 group-hover:scale-[1.02]" />
        ) : (
          <div className="flex aspect-[16/9] items-center justify-center bg-gradient-to-br from-blue-800 via-blue-950 to-slate-950"><IoCarSportOutline className="h-24 w-24 text-blue-300 transition group-hover:scale-110" /></div>
        )}
        <div className="space-y-4 p-6">
          <div><span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-200">{vehicle.condition}</span><h3 className="mt-3 text-2xl font-bold">{vehicle.year} {vehicle.make} {vehicle.model}</h3></div>
          <div className="flex gap-5 text-sm text-slate-300"><span className="flex items-center gap-1"><IoSpeedometerOutline /> {vehicle.mileage.toLocaleString("es-CL")} km</span><span className="flex items-center gap-1"><IoLocationOutline /> {vehicle.location}</span></div>
          <strong className="block text-2xl text-blue-300">{formatPrice(vehicle.price)}</strong>
        </div>
      </Link>
    </article>
  );
}
