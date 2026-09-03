export const MAX_PRODUCT_IMAGES = 5;

const MAX_SOURCE_SIZE = 8 * 1024 * 1024;
const MAX_ENCODED_SIZE = 145_000;

function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.readAsDataURL(file);
  });
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("El archivo no contiene una imagen válida."));
    image.src = source;
  });
}

export async function optimizeProductImage(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Selecciona un archivo de imagen.");
  if (file.size > MAX_SOURCE_SIZE) throw new Error("La imagen original no puede superar 8 MB.");

  const source = await readFile(file);
  const image = await loadImage(source);
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 900;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("No se pudo preparar la imagen.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  const padding = 48;
  const availableWidth = canvas.width - padding * 2;
  const availableHeight = canvas.height - padding * 2;
  const scale = Math.min(availableWidth / image.naturalWidth, availableHeight / image.naturalHeight);
  const width = Math.round(image.naturalWidth * scale);
  const height = Math.round(image.naturalHeight * scale);
  context.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);

  for (const quality of [0.8, 0.7, 0.6, 0.5, 0.4]) {
    const encoded = canvas.toDataURL("image/webp", quality);
    if (encoded.length <= MAX_ENCODED_SIZE) return encoded;
  }

  const compactCanvas = document.createElement("canvas");
  compactCanvas.width = 900;
  compactCanvas.height = 675;
  const compactContext = compactCanvas.getContext("2d");
  if (!compactContext) throw new Error("No se pudo preparar la imagen.");
  compactContext.drawImage(canvas, 0, 0, compactCanvas.width, compactCanvas.height);
  const encoded = compactCanvas.toDataURL("image/webp", 0.42);
  if (encoded.length > MAX_ENCODED_SIZE) throw new Error("La imagen es demasiado compleja. Usa una imagen más simple.");
  return encoded;
}
