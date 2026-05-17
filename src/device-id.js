const os = require('os');
const crypto = require('crypto');

/**
 * Gera um ID único e estável para este dispositivo baseado em:
 * - Endereço MAC da placa de rede principal
 * - Hostname da máquina
 * - Modelo do processador
 * Resultado: SHA-256 de 32 caracteres em maiúsculas.
 */
function getDeviceId() {
    const interfaces = os.networkInterfaces();
    let mac = 'no-mac';

    outer: for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (!iface.internal && iface.mac && iface.mac !== '00:00:00:00:00:00') {
                mac = iface.mac;
                break outer;
            }
        }
    }

    const hostname = os.hostname();
    const cpu = os.cpus()[0]?.model || 'unknown';
    const raw = `${mac}|${hostname}|${cpu}`;

    return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 32).toUpperCase();
}

module.exports = { getDeviceId };
