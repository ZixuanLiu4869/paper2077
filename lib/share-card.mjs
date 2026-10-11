// Fixed invitation artwork. Deliberately accepts no paper, story or visitor data.
export const INVITATION_URL = 'https://iclr-2077-future-archives.wholehake256.chatgpt.site/';
function line(c, x1, y1, x2, y2) { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
function orbit(c) {
  c.save(); c.translate(35, 193); c.scale(.65, .65);
  c.strokeStyle = '#e6e4da'; c.lineWidth = 1;
  for (let x = 0; x <= 500; x += 25) line(c, x, 0, x, 250);
  for (let y = 0; y <= 250; y += 25) line(c, 0, y, 500, y);
  c.fillStyle = '#e3aa86'; c.beginPath(); c.arc(250, 125, 76, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#282e27'; c.lineWidth = 1.5;
  for (const [rx, ry, angle] of [[174, 49, -.42], [174, 49, .42], [110, 90, -.61]]) { c.beginPath(); c.ellipse(250, 125, rx, ry, angle, 0, Math.PI * 2); c.stroke(); }
  c.fillStyle = '#282e27';
  for (const [x, y, r] of [[106, 169, 6], [401, 85, 4], [215, 40, 4]]) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }
  c.restore();
}
export function drawShareCard(canvas, sponsorLogo) {
  if (!sponsorLogo) throw new Error('The sponsor logo is unavailable.');
  canvas.width = 1200; canvas.height = 630;
  const c = canvas.getContext('2d'); if (!c) throw new Error('Image export is unavailable.');
  c.fillStyle = '#f6f3eb'; c.fillRect(0, 0, 1200, 630);
  c.fillStyle = '#364735'; c.font = 'bold 27px Arial'; c.fillText('ICLR 2077', 64, 64);
  c.fillStyle = '#6c7267'; c.font = '11px monospace'; c.fillText('A LITTLE HOPE, FIFTY YEARS AHEAD', 64, 97);
  c.fillStyle = '#282e27'; c.font = '76px Georgia'; c.fillText('A paper.', 64, 200);
  c.font = '64px Georgia'; c.fillText('A very different', 64, 275);
  c.fillStyle = '#bb6947'; c.font = 'italic 80px Georgia'; c.fillText('future.', 64, 355);
  c.font = '58px Georgia'; c.fillText('✳', 330, 355);
  c.fillStyle = '#6c7267'; c.font = '18px Arial'; c.fillText('The reviews can wait a moment.', 64, 412);
  c.fillStyle = '#364735'; c.font = 'bold 20px Arial'; c.fillText('Come explore the future. →', 64, 465);
  c.save(); c.translate(725, 88); c.rotate(-.055);
  c.fillStyle = '#e7e4d9'; c.fillRect(10, 13, 394, 390);
  c.fillStyle = '#f7f8ef'; c.fillRect(0, 0, 394, 390);
  c.strokeStyle = '#c4c4b4'; c.lineWidth = 1; c.strokeRect(0, 0, 394, 390);
  c.fillStyle = '#506b49'; c.fillRect(0, 0, 394, 4);
  c.fillStyle = '#6c7267'; c.font = '9px monospace'; c.fillText('2077 EDITION', 22, 26); c.fillText('FICTIONAL FUTURE', 258, 26);
  c.strokeStyle = '#282e27'; line(c, 22, 38, 372, 38);
  c.fillStyle = '#282e27'; c.font = '28px Georgia'; c.fillText('✳ The 2077 Field Guide', 22, 80);
  line(c, 22, 94, 372, 94);
  c.fillStyle = '#6c7267'; c.font = '9px monospace'; c.fillText('A WORLD THAT COULD BE', 22, 112);
  c.fillStyle = '#282e27'; c.font = 'bold 34px Georgia'; c.fillText('Attention Was', 22, 155); c.fillText('All You Needed', 22, 192);
  orbit(c);
  c.fillStyle = '#282e27'; c.font = '13px Georgia'; c.fillText('By 2077, AI had moved on.', 22, 365); c.fillText('Attention had moved into a museum.', 22, 383);
  c.restore();
  c.strokeStyle = '#d9d9cd'; c.lineWidth = 1; line(c, 64, 530, 1136, 530);
  c.fillStyle = '#6c7267'; c.font = '11px monospace'; c.fillText('YOUR NEXT STOP: 2077', 64, 565);
  c.fillStyle = '#364735'; c.font = '17px Arial'; c.fillText(INVITATION_URL, 64, 598);
  c.drawImage(sponsorLogo, 875, 573, 56, 42);
  c.fillStyle = '#6c7267'; c.font = '11px Arial'; c.fillText('SPONSORED BY', 947, 581);
  c.fillStyle = '#101e36'; c.font = 'bold 26px Arial'; c.fillText('Detectium', 947, 609);
  return canvas;
}
