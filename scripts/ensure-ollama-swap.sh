#!/usr/bin/env bash

set -euo pipefail

# Prepara swap en el host para que Ollama no sea terminado cuando la RAM se
# acerque al límite. No modifica ni desactiva swaps existentes.
required_kib=$((4 * 1024 * 1024))
swapfile="${OLLAMA_SWAPFILE:-/swapfile-ollama-4g}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Este script debe ejecutarse como root (sudo)." >&2
  exit 1
fi

active_kib="$(awk 'NR > 1 { total += $3 } END { print total + 0 }' /proc/swaps)"

if (( active_kib >= required_kib )); then
  echo "Swap activa suficiente: $((active_kib / 1024 / 1024)) GiB."
  exit 0
fi

if [[ -e "$swapfile" ]]; then
  if ! [[ -f "$swapfile" ]]; then
    echo "La ruta de swap existe pero no es un archivo regular: $swapfile" >&2
    exit 1
  fi
  if ! swapon --show=NAME --noheadings | awk '{ print $1 }' | grep -Fxq "$swapfile"; then
    chmod 600 "$swapfile"
    mkswap "$swapfile" >/dev/null
    swapon "$swapfile"
  fi
else
  fallocate -l 4G "$swapfile"
  chmod 600 "$swapfile"
  mkswap "$swapfile" >/dev/null
  swapon "$swapfile"
fi

if ! grep -Fqx "$swapfile none swap sw 0 0" /etc/fstab; then
  echo "$swapfile none swap sw 0 0" >> /etc/fstab
fi

# Evita usar swap prematuramente, pero permite recurrir a ella bajo presión.
sysctl -w vm.swappiness="${OLLAMA_SWAPPINESS:-10}" >/dev/null

echo "Swap de 4 GiB activa y configurada para persistir: $swapfile"
