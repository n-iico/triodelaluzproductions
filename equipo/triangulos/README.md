# Laboratorios en español e inglés

La portada y los laboratorios comparten la preferencia `tdl-triangulos-language-v1`.
Última Esperanza usa su traducción original; Ledalen carga su documento cifrado
en español (`contenido.tlab`) o inglés (`contenido.en.tlab`). Ambas versiones usan
la misma sesión de acceso. El contenido del laboratorio nunca se publica como
HTML sin cifrar.

Para actualizar los laboratorios, ejecuta `scripts/preparar-triangulos.mjs` con
`--source-root` apuntando a `herramientas`, `--ledalen-en` al HTML inglés autónomo
de Ledalen y `--output` a esta carpeta. Entrega la clave únicamente por entrada
estándar, como JSON con el campo `password`. Publica juntos el catálogo y los tres
documentos cifrados; todos comparten salt y clave derivada, con IV distintos.

El HTML inglés conserva datos, bibliotecas, imágenes y fuentes incrustados. Una
actualización del español debe ir acompañada de su traducción inglesa antes de
regenerar los archivos. No añadas los originales sin cifrar al repositorio web.
