import { eventDate, locationLabel, priceLabel } from './model.ts';
import type { Event, Registration } from './model.ts';
import { picture } from './ui.ts';

async function loadImage(src: string) {
  const image = new Image();
  image.src = src;
  await image.decode();
  return image;
}

export async function ticketImage(ticket: Registration, event: Event) {
  const [photo, mark] = await Promise.all([loadImage(picture(event)), loadImage('/assets/eventify.png')]);
  const canvas = document.createElement('canvas');
  canvas.width = 1000;
  canvas.height = 1100;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas indisponível');
  context.fillStyle = '#3b2315';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#fcf1e3';
  context.beginPath();
  context.roundRect(48, 48, 904, 1004, 28);
  context.fill();
  context.drawImage(mark, 86, 85, 225, 50);
  context.fillStyle = '#685244';
  context.font = '600 22px Segoe UI, sans-serif';
  context.textAlign = 'right';
  context.fillText('INGRESSO DEMONSTRATIVO', 914, 119);
  context.textAlign = 'left';

  const photoWidth = 828;
  const photoHeight = 375;
  const scale = Math.max(photoWidth / photo.width, photoHeight / photo.height);
  const sourceWidth = photoWidth / scale;
  const sourceHeight = photoHeight / scale;
  context.save();
  context.beginPath();
  context.roundRect(86, 166, photoWidth, photoHeight, 15);
  context.clip();
  context.drawImage(photo, (photo.width-sourceWidth)/2, (photo.height-sourceHeight)/2, sourceWidth, sourceHeight, 86, 166, photoWidth, photoHeight);
  context.restore();

  context.fillStyle = '#29180f';
  context.font = 'bold italic 61px Georgia, serif';
  context.fillText(event.title, 86, 627, photoWidth);
  context.font = '30px Segoe UI, sans-serif';
  context.fillText(eventDate(event), 88, 685, photoWidth);
  context.fillText(locationLabel(event), 88, 737, photoWidth);
  context.fillText(ticket.name + ' · ' + priceLabel(ticket.price), 88, 789, photoWidth);
  context.strokeStyle = '#bca48d';
  context.lineWidth = 2;
  context.setLineDash([8, 9]);
  context.beginPath();
  context.moveTo(86, 834);
  context.lineTo(914, 834);
  context.stroke();
  context.textAlign = 'center';
  context.font = '600 22px Segoe UI, sans-serif';
  context.fillStyle = '#685244';
  context.fillText('CÓDIGO DO INGRESSO', 500, 898);
  context.font = 'bold 50px ui-monospace, monospace';
  context.fillStyle = '#a23816';
  context.fillText(ticket.code, 500, 966, photoWidth - 30);
  return new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => {
    if (blob) resolve(blob);
    else reject(new Error('Falha ao gerar o PNG'));
  }, 'image/png'));
}
