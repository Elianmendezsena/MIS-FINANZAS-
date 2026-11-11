# Servidor (Supabase, proyecto `mis-finanzas`)
- Tablas: `mf_docs` (datos cifrados por usuario), `mf_push` (dispositivos con avisos), `mf_avisos` (fecha y nombre de pagos por avisar), `mf_conf` (privada: llaves de envío y secreto del cron).
- Función `avisos`: envía las notificaciones. Un cron diario (13:00 UTC = 9:00 a. m. RD) la llama.
- El código de la función está en `supabase/avisos.ts`.
