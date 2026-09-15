# Pendientes SEO: fichas de comerciantes de Google

Este documento registra los avisos detectados por Google Search Console en los datos estructurados de productos de ViccsAuto.

## Estado actual

Las fichas públicas generan datos estructurados JSON-LD con los tipos `Product` y `Offer`. Actualmente informan datos básicos como nombre, descripción, precio, moneda, disponibilidad y condición, pero Google detectó información comercial incompleta.

Estos avisos no afectan el funcionamiento de la tienda ni significan que la base de datos esté dañada. Pueden limitar la calidad o la visibilidad de las fichas en Google Shopping, Google Imágenes y otros resultados enriquecidos.

## Avisos pendientes

### 1. Identificador internacional, GTIN o marca

Google necesita identificar correctamente cada producto mediante los datos reales proporcionados por el fabricante.

Datos que se deben recopilar por producto:

- Marca real del fabricante.
- GTIN, EAN o UPC, si existe en el producto o su embalaje.
- MPN o número de parte del fabricante.
- Código OEM, cuando corresponda a un identificador real del fabricante.

Reglas importantes:

- No inventar ni aproximar un GTIN.
- No usar automáticamente el SKU interno como GTIN.
- Un código OEM puede utilizarse como `mpn` solamente si realmente identifica la pieza para su fabricante.
- Para productos que genuinamente no poseen GTIN, se debe informar la marca y el MPN reales cuando estén disponibles.
- Usar `ViccsAuto` como marca únicamente en productos propios o de marca privada, no en productos revendidos de terceros.

Pendiente técnico:

- Evaluar la incorporación de campos específicos `gtin` y `mpn` al modelo de productos.
- Agregar esos campos a los formularios administrativos de creación y edición.
- Publicarlos en el JSON-LD únicamente cuando contengan valores reales y válidos.
- Revisar los productos existentes que no tienen marca ni código OEM.

### 2. `hasMerchantReturnPolicy`

Este campo describe la política de cambios y devoluciones aplicable a las ofertas.

Antes de implementarlo se debe definir y confirmar:

- País donde aplica la política.
- Cantidad de días disponibles para solicitar una devolución.
- Si la devolución se realiza presencialmente, por correo o mediante ambos métodos.
- Quién paga el costo del envío de devolución.
- Si existen costos o cargos adicionales.
- Excepciones para repuestos instalados, productos usados, productos eléctricos u otras categorías.
- URL pública definitiva de la política de devoluciones.

El sitio ya dispone de la ruta `/returns`, pero su contenido debe coincidir exactamente con los datos estructurados. No se deben publicar plazos o condiciones que no aparezcan también en la política visible para el cliente.

Google recomienda declarar una política general dentro de los datos de `Organization`. Las excepciones particulares de un producto pueden declararse dentro de su `Offer` mediante `hasMerchantReturnPolicy`.

### 3. `shippingDetails`

Este campo describe las condiciones de despacho de cada oferta.

Antes de implementarlo se debe definir y confirmar:

- País de destino.
- Regiones o comunas atendidas.
- Costo para retiro en tienda.
- Costo de despacho dentro de Arica.
- Costo o forma de cálculo para Iquique y otras regiones.
- Tiempo mínimo y máximo de preparación del pedido.
- Tiempo mínimo y máximo de tránsito o entrega.
- Diferencias entre productos, repuestos y vehículos.

La información declarada debe coincidir con las modalidades y precios reales del checkout. Si las condiciones son generales para toda la tienda, se recomienda definir una política global de envíos en `Organization`; las excepciones pueden agregarse en cada `Offer` mediante `shippingDetails`.

## Archivos relacionados

- `src/app/(shop)/product/[slug]/page.tsx`: JSON-LD de repuestos y productos.
- `src/app/(shop)/vehicle/[slug]/page.tsx`: JSON-LD de vehículos.
- `src/app/layout.tsx`: datos estructurados generales de la organización.
- `src/app/(shop)/returns/page.tsx`: política visible de cambios y devoluciones.
- `src/app/(shop)/terms/page.tsx`: condiciones comerciales y de despacho.
- `src/app/actions/checkout.ts`: modalidades y costos utilizados durante la compra.
- `src/config/site.ts`: datos generales, país, moneda y URL del sitio.
- `prisma/schema.prisma`: modelo de datos donde podrían agregarse GTIN y MPN.

## Decisión pendiente para vehículos

Las páginas de vehículos ofrecen cotización por WhatsApp y no compra directa mediante carrito. Se debe revisar si conviene mantenerlas como fichas de comerciante con `Offer` o tratarlas solamente como fichas informativas de producto. Esta decisión debe tomarse antes de aplicar una política de envío propia de productos comprables a los vehículos.

## Lista de implementación

- [ ] Confirmar la política comercial real de devoluciones.
- [ ] Confirmar destinos, costos y tiempos reales de despacho.
- [ ] Completar marcas faltantes en los productos existentes.
- [ ] Recopilar GTIN/EAN/UPC reales cuando existan.
- [ ] Recopilar MPN o códigos OEM reales.
- [ ] Decidir cómo se marcarán los vehículos destinados solo a cotización.
- [ ] Actualizar el modelo de datos y los formularios administrativos si se necesitan campos nuevos.
- [ ] Agregar la política global de devoluciones al JSON-LD de `Organization`.
- [ ] Agregar la política global de envíos al JSON-LD de `Organization`.
- [ ] Agregar excepciones por producto solamente cuando correspondan.
- [ ] Verificar que el contenido estructurado coincida con las páginas visibles y el checkout.
- [ ] Validar las URLs con la prueba de resultados enriquecidos de Google.
- [ ] Publicar los cambios y solicitar una nueva validación en Search Console.
- [ ] Esperar el nuevo rastreo de Google; la actualización del informe puede tardar varios días.

## Herramientas de validación

- Documentación de fichas de comerciantes: <https://developers.google.com/search/docs/appearance/structured-data/merchant-listing>
- Identificadores únicos de productos: <https://support.google.com/merchants/answer/160161>
- Prueba de resultados enriquecidos: <https://search.google.com/test/rich-results>
- Google Search Console: <https://search.google.com/search-console>

