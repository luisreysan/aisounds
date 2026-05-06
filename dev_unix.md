# AI Sounds en Unix (Ubuntu/WSL/macOS) - Guía de desarrollo y validación local

Este documento deja todo el contexto e instrucciones para ejecutar y validar `ai_sounds` en un entorno Unix cuando el CLI todavía no está publicado en npm.

## Objetivo

Validar de extremo a extremo que:

1. El backend local sirve metadata y bundles correctamente.
2. El CLI local descarga e instala packs en Linux/Unix.
3. La terminal Unix puede reproducir sonidos.
4. Cursor y Claude Code reproducen sonidos mediante hooks instalados por el CLI.

## Contexto clave del proyecto

- El CLI soporta plataformas por `process.platform`:
  - `darwin` -> `mac`
  - `win32` -> `windows`
  - `linux` -> `linux`
- En Linux/WSL, el CLI solicita bundles con `platform=linux`.
- Reproducción en Unix:
  - `paplay` (preferido)
  - `ffplay` (fallback)
  - `aplay` (fallback final)
- Reproducción en macOS:
  - `afplay`
- Reproducción en Windows:
  - PowerShell + `System.Windows.Media.MediaPlayer` (MP3 si existe).

Importante: para validar Unix de verdad, trabajar dentro del filesystem Linux (por ejemplo `~/ai_sounds`), no en rutas montadas de Windows (`/mnt/c/...`).

---

## 1) Prerrequisitos en Ubuntu 24.04 LTS

```bash
sudo apt update
sudo apt install -y git curl ffmpeg pulseaudio-utils
```

Node.js debe ser `>=20`:

```bash
node -v
```

Si no cumples versión, instala Node 20+ con tu método preferido (`nvm`, `fnm`, NodeSource, etc.).

Instala `pnpm` vía Corepack:

```bash
corepack enable
```

---

## 2) Clonar repo y preparar workspace

```bash
cd ~
git clone <URL_DEL_REPO> ai_sounds
cd ai_sounds
pnpm install
```

---

## 3) Levantar app local (web/api) y CLI local

Como el CLI no está en npm todavía, se prueba local.

### Terminal A: levantar backend/web

Usa el script de desarrollo del repo (ejemplo habitual):

```bash
pnpm dev
```

Si este monorepo usa otro comando específico, usar ese.

### Terminal B: compilar CLI

```bash
pnpm --filter @aisounds/cli build
```

---

## 4) Verificar audio base del sistema (antes del CLI)

Comprobar que Linux/VM realmente saca audio:

```bash
paplay /usr/share/sounds/alsa/Front_Center.wav
```

Fallback de prueba:

```bash
ffplay -nodisp -autoexit -loglevel quiet /ruta/a/archivo.ogg
```

Si esto falla, arreglar audio del sistema/VM primero (no es un bug del CLI).

---

## 5) Ejecutar CLI local contra localhost

Desde la raíz del repo:

```bash
AISOUNDS_API_URL=http://localhost:3000 node apps/cli/dist/index.js --help
```

Preview de un pack:

```bash
AISOUNDS_API_URL=http://localhost:3000 node apps/cli/dist/index.js preview <slug>
```

Instalar/activar para Cursor:

```bash
AISOUNDS_API_URL=http://localhost:3000 node apps/cli/dist/index.js install <slug> --tool cursor
AISOUNDS_API_URL=http://localhost:3000 node apps/cli/dist/index.js activate <slug> --tool cursor
```

Instalar/activar para Claude Code:

```bash
AISOUNDS_API_URL=http://localhost:3000 node apps/cli/dist/index.js install <slug> --tool claude-code
AISOUNDS_API_URL=http://localhost:3000 node apps/cli/dist/index.js activate <slug> --tool claude-code
```

Opcional (más cómodo para iterar):

```bash
cd apps/cli
npm link
AISOUNDS_API_URL=http://localhost:3000 aisounds --help
AISOUNDS_API_URL=http://localhost:3000 aisounds preview <slug>
```

---

## 6) Verificaciones funcionales en herramientas

### Cursor (Linux)

- Reiniciar Cursor tras instalar/activar.
- Verificar archivo de hooks:
  - `~/.cursor/hooks.json` (global)
  - o `<proyecto>/.cursor/hooks.json` (scope proyecto)
- Disparar eventos (ej. completar tarea, error) y confirmar audio.

### Claude Code (Linux)

- Reiniciar Claude Code tras instalar/activar.
- Verificar:
  - `~/.claude/settings.json` (global)
  - o `<proyecto>/.claude/settings.json` (scope proyecto)
- Enviar prompts y confirmar:
  - `prompt_sent`
  - `task_complete`
  - `task_failed` (si aplica)

---

## 7) Checklist de validación Unix (rápida)

- [ ] `node -v` es >= 20.
- [ ] `pnpm install` completado sin errores.
- [ ] App local (`localhost`) levantada.
- [ ] CLI compilado (`apps/cli/dist/index.js` existe).
- [ ] `paplay`/`ffplay` reproducen audio en terminal.
- [ ] `preview <slug>` suena.
- [ ] `install + activate` en Cursor funciona.
- [ ] `install + activate` en Claude Code funciona.
- [ ] Se generan/actualizan hooks en rutas Unix.

---

## 8) Problemas comunes y diagnóstico

### No suena nada en `preview`

1. Confirmar audio del sistema con `paplay` o `ffplay`.
2. Confirmar que el backend local responde en `AISOUNDS_API_URL`.
3. Confirmar que el pack existe/publicado en la base local.

### Suena en terminal pero no en Cursor/Claude

1. Reiniciar la herramienta (muchas solo recargan hooks al iniciar).
2. Revisar JSON de hooks y que las entradas `_aisounds` estén presentes.
3. Copiar y ejecutar manualmente el comando del hook en terminal.

### WSL2 sin audio

- Verificar integración de audio WSL/Windows o servidor PulseAudio.
- Si `paplay` falla en WSL, arreglar entorno de audio antes de depurar CLI.

---

## 9) Nota sobre macOS

Este flujo valida Unix/Linux. En macOS el concepto es el mismo, pero la reproducción usa `afplay`.
Si Linux pasa (instalación + hooks + descarga + preview) y la ruta `darwin` sigue verde en tests, la probabilidad de éxito en macOS es alta.

---

## 10) Comando útil para test del paquete CLI

```bash
pnpm --filter @aisounds/cli test
```

Debe pasar la suite del CLI antes de validar manualmente en herramientas.
