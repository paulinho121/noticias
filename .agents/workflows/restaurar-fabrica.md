---
description: Como restaurar o sistema para a Versão de Fábrica
---

Este workflow restaura o código exatamente para o estado marcado como "Versão de Fábrica" (`versao-fabrica`).

**AVISO:** Isso irá descartar qualquer alteração local não salva e resetar o código para o commit `6f31e7a`.

### Passos para restaurar:

1. Garanta que salvou qualquer trabalho pendente.
// turbo
2. Execute o comando de reset para a tag:
```bash
git reset --hard versao-fabrica
```

3. Se houver novas dependências instaladas após a versão de fábrica, rode:
```bash
npm install
```

4. O sistema voltará ao estado estável de 21/02/2026.
