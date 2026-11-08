/**
 * Configuração dinâmica por cima do app.json.
 *
 * IOS_ALLOW_HTTP=1 vem do perfil `ios-sideload-dev` do eas.json. O
 * development build instalado no iPhone precisa carregar o JavaScript e falar
 * com o Auth Emulator/servidor por http, inclusive pelo IP do Tailscale
 * (100.x), que o App Transport Security do iOS não trata como rede local. Os
 * builds normais continuam exigindo https.
 */
module.exports = ({ config }) => {
  if (process.env.IOS_ALLOW_HTTP === '1') {
    config.ios = {
      ...config.ios,
      infoPlist: {
        ...config.ios?.infoPlist,
        // Só NSAllowsArbitraryLoads: se NSAllowsLocalNetworking estiver junto, o iOS
        // ignora o ArbitraryLoads e bloqueia http para o IP do Tailscale (100.x).
        NSAppTransportSecurity: { NSAllowsArbitraryLoads: true },
      },
    };
  }
  return config;
};
