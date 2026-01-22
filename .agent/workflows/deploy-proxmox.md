---
description: Cómo instalar Todo Work en un contenedor LXC o VM de Proxmox
---

Sigue estos pasos para un despliegue limpio en Proxmox:

1. Crea un contenedor LXC (Debian 12 recomendado).
2. Accede a la consola como root.
3. Ejecuta el comando de instalación:
   ```bash
   apt-get update && apt-get install -y git && git clone https://github.com/mikiligero/todo-work.git /tmp/install-temp && cd /tmp/install-temp && chmod +x install.sh && ./install.sh
   ```
4. Accede a `http://<IP-LXC>:3001`.
