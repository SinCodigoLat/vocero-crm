#!/bin/sh
# Fork SinCódigo — Carga las credenciales de Google Calendar + Meet de la
# organización sin pasar por la pantalla (los secretos no tocan un formulario).
# Lee por stdin: {"clientId":"…","clientSecret":"…","refreshToken":"…","calendarId":"primary"}
# Uso (desde el Mac):  … | ssh mivps 'cd /root/vocero-crm && sh scripts/sincodigo/set-google-creds.sh'
# Cifra con la ENCRYPTION_KEY del contenedor app (AES-256-GCM, igual que el CRM).
set -eu
DC="docker compose -f docker-compose.yml -f docker-compose.sincodigo.yml"
ORG=${1:-$($DC exec -T postgres psql -U postgres -d vocero -At -c "select id from organization order by created_at limit 1")}
$DC exec -T app node -e '
const c=require("crypto");let d="";process.stdin.on("data",x=>d+=x).on("end",()=>{
const j=JSON.parse(d);const k=Buffer.from(process.env.ENCRYPTION_KEY,"base64");
const enc=p=>{const iv=c.randomBytes(12);const ci=c.createCipheriv("aes-256-gcm",k,iv);
const e=Buffer.concat([ci.update(p,"utf8"),ci.final()]);return [e.toString("base64"),iv.toString("base64"),ci.getAuthTag().toString("base64")]};
const q=s=>"\x27"+String(s).replace(/\x27/g,"\x27\x27")+"\x27";
const [sc,si,st]=enc(j.clientSecret),[rc,ri,rt]=enc(j.refreshToken);const org=process.argv[1];
const cal=j.calendarId||"primary";
console.log(`insert into google_credentials (id,organization_id,client_id,client_secret_cipher,client_secret_iv,client_secret_tag,refresh_token_cipher,refresh_token_iv,refresh_token_tag,calendar_id,status)
values (${q("gcred_"+c.randomBytes(9).toString("hex"))},${q(org)},${q(j.clientId)},${q(sc)},${q(si)},${q(st)},${q(rc)},${q(ri)},${q(rt)},${q(cal)},\x27connected\x27)
on conflict (organization_id) do update set client_id=excluded.client_id,client_secret_cipher=excluded.client_secret_cipher,client_secret_iv=excluded.client_secret_iv,client_secret_tag=excluded.client_secret_tag,refresh_token_cipher=excluded.refresh_token_cipher,refresh_token_iv=excluded.refresh_token_iv,refresh_token_tag=excluded.refresh_token_tag,calendar_id=excluded.calendar_id,status=\x27connected\x27,updated_at=now();`)});' "$ORG" \
| $DC exec -T postgres psql -U postgres -d vocero -v ON_ERROR_STOP=1 -q
echo "google_credentials cargadas para $ORG"
