# ViccsAuto

Ecommerce automotriz para autopartes, repuestos y vehículos, orientado inicialmente a Arica, Chile. Incluye catálogo dinámico, compatibilidad, cuentas, carrito persistente, checkout transaccional, pedidos, inventario, administración, auditoría, SEO y proveedores sandbox.

## Requisitos

- Node.js 20.19 o superior
- npm 10 o superior
- Docker Desktop o una instancia PostgreSQL 16 accesible

## Instalación local

1. Ejecuta `npm install`.
2. Copia `.env.example` a `.env` y reemplaza todos los valores de ejemplo. `SESSION_SECRET` debe contener al menos 32 caracteres aleatorios.
3. Inicia PostgreSQL con `npm run db:up` y espera a que el contenedor esté saludable.
4. Ejecuta `npm run db:generate`, `npm run db:migrate:deploy`, `npm run db:vehicles:import` y `npm run db:seed`.
5. Inicia con `npm run dev` y abre `http://localhost:3000`.

La semilla exige `SEED_ADMIN_PASSWORD`; nunca uses esa contraseña en producción ni confirmes `.env` en Git.

`db:vehicles:import` carga en PostgreSQL el catálogo de marcas y modelos de vehículos de la API pública vPIC de NHTSA, además de los años desde 1950 hasta dos años posteriores al año actual. Puedes volver a ejecutarlo: usa inserciones idempotentes y no duplica registros. La fuente es principalmente estadounidense, por lo que una compatibilidad comercial siempre debe verificarse con VIN, motor o código OEM.

La marca del repuesto es opcional. Desde **Admin → Productos → Gestionar** se agregan una o más compatibilidades por producto, cada una con marca, modelo, año inicial, año final y motor opcional.

## Verificación

- `npm run test`: precios, envíos y transiciones de pedidos.
- `npm run typecheck`: tipos TypeScript.
- `npm run lint`: reglas de Next.js y React.
- `npm run build`: compilación de producción.
- `npm audit --omit=dev`: auditoría de dependencias de ejecución.

El flujo manual crea un pago pendiente; nunca lo marca como pagado automáticamente. Un administrador debe confirmar pago y entrega desde `/admin/orders`.

## Arquitectura

- `src/lib/catalog-repository.ts`: lectura y mapeo del catálogo Prisma.
- `src/lib/auth.ts`: sesiones JWT firmadas en cookies httpOnly.
- `src/lib/cart.ts`: carrito anónimo o asociado a usuario.
- `src/app/actions`: mutaciones validadas en servidor.
- `src/lib/providers.ts`: contratos de pago, despacho y correo, con adaptadores manuales/sandbox.
- `prisma/schema.prisma`: modelo PostgreSQL.
- `prisma/migrations`: historial SQL versionado aplicado por Prisma Migrate.
- `compose.yaml`: PostgreSQL 16 local con volumen persistente y health check.

Checkout vuelve a consultar precio y stock, descuenta producto e inventario y crea pedido, pago, despacho y movimiento dentro de una transacción. `checkoutToken` evita pedidos duplicados. Las páginas de pedidos verifican propiedad; administración exige rol `ADMIN` o `STAFF`.

## Base de datos y producción

ViccsAuto usa PostgreSQL. Durante desarrollo crea nuevas migraciones con `npm run db:migrate -- --name descripcion_del_cambio`. En staging y producción aplica únicamente migraciones confirmadas mediante `npm run db:migrate:deploy`; no uses `db push` ni `migrate dev` en producción.

Configura `DATABASE_URL` con una conexión PostgreSQL directa para migraciones. Si el proveedor ofrece pooling, utiliza la URL recomendada por el proveedor para la aplicación y conserva una conexión directa separada para Prisma Migrate. Antes de cada despliegue crítico crea un respaldo y prueba periódicamente la restauración.

Configura un almacenamiento S3-compatible o Cloudinary para imágenes y adapta `PaymentProvider`, `ShippingProvider` y `MailProvider` con credenciales exclusivamente en variables de entorno. Los webhooks reales deben validar firma, importe, moneda e idempotencia antes de cambiar un pago.

El endpoint `/api/health` comprueba disponibilidad de aplicación y base. Configura copias de seguridad cifradas, prueba restauraciones y monitoriza respuestas 5xx. Los encabezados CSP, anti-framing, MIME sniffing, referrer y permisos se definen en `next.config.mjs`.
