/**
 * Prueba de envío de correo — "Hola Mundo"
 * Ejecutar: npm run mail:test
 * Revisar el correo en la bandeja de Mailtrap (sandbox).
 */
import { sendMail } from '../common/mailer';
import { logger } from '../common/logger';

const to = process.env.TEST_EMAIL ?? 'destino@ejemplo.com';

async function main() {
  logger.info({ to, script: 'send-test-email' }, 'Enviando correo de prueba');
  const result = await sendMail({
    to,
    subject: 'Hola Mundo — Flutter My Assets',
    text: 'Hola Mundo.\n\nEste es un correo de prueba desde la API.',
    html: '<p><strong>Hola Mundo</strong></p><p>Este es un correo de prueba desde la API Flutter My Assets.</p>',
  });
  logger.info({ to, messageId: result.messageId, script: 'send-test-email' }, 'Correo enviado correctamente');
}

main().catch((err) => {
  logger.error({ err: err.message, script: 'send-test-email' }, 'Error al enviar correo');
  process.exit(1);
});
