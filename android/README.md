# Eventify para Android

O APK usa a interface web da Eventify dentro de uma Activity em Kotlin. O build inclui os recursos da interface e gera um arquivo JavaScript compatível com o WebView do Android 10. O app roda sem internet. Os dados ficam no aparelho. O pagamento continua simulado.

## Instalar

Abra `dist/Eventify.apk` no Android 10 ou superior com o Android System WebView atualizado. Se o Android pedir permissão de instalação, autorize o app pelo qual você abriu o arquivo.

Para atualizar uma instalação assinada com a mesma chave de teste, abra o novo APK e toque em **Atualizar**. Se o app fechar na abertura, pressione e segure o ícone da Eventify na lista de aplicativos e toque em **Diagnóstico**. A tela mostra a versão instalada e o último encerramento que o Android registrou. Quando a tela de erro aparecer dentro do app, use **Abrir diagnóstico**.

## Gerar o APK

Use Node.js 24 ou superior, JDK 21, um SDK Android com plataforma e Build Tools de API 35 ou mais recentes e a distribuição de linha de comando do Kotlin 2.2.21. Defina `JAVA_HOME`, `ANDROID_HOME` e `KOTLIN_HOME` para suas respectivas instalações. Na raiz da Eventify, execute:

```
npm install --no-save esbuild@0.28.2
node android/build-apk.mjs
```

O APK assinado para testes fica em `dist/Eventify.apk`. Para instalar futuras versões por cima desta, preserve a chave de teste que o build grava em `dist/.eventify-test.p12`.
