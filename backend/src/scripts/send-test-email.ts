/**
 * Prueba de envío de correo — "Hola Mundo"
 * Ejecutar: npm run mail:test
 * Revisar el correo en la bandeja de Mailtrap (sandbox).
 */
import { sendMail } from '../common/mailer';

const to = process.env.TEST_EMAIL ?? 'destino@ejemplo.com';

async function main() {
  console.log('Enviando correo de prueba a:', to);
  const result = await sendMail({
    to,
    subject: 'Hola Mundo — Flutter My Assets',
    text: 'Hola Mundo.\n\nEste es un correo de prueba desde la API.',
    html: '<p><strong>Hola Mundo</strong></p><p>Este es un correo de prueba desde la API Flutter My Assets.</p>',
  });
  console.log('Enviado correctamente. MessageId:', result.messageId);
}

main().catch((err) => {
  console.error('Error al enviar:', err);
  process.exit(1);
});
