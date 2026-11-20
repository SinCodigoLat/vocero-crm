#!/usr/bin/env bash
# Fork SinCódigo — Cambia el número de WhatsApp de la organización sin pasar por
# el formulario (que fija un override a nivel NÚMERO). Úsalo cuando la app ya
# quedó suscrita a la WABA con override hacia este Vocero.
# stdin: {"token":"…","wabaId":"…","phoneNumberId":"…","displayPhoneNumber":"…","verifiedName":"…","messagingAccountId":null}
# Antes de cambiar, respalda la fila actual en backups/meta_credentials-<fecha>.csv (token cifrado).
set -euo pipefail
DC="docker compose -f docker-compose.yml -f docker-compose.sincodigo.yml"
ORG=${1:-$($DC exec -T postgres psql -U postgres -d vocero -At -c "select id from organization order by created_at limit 1" </dev/null)}
mkdir -p backups
$DC exec -T postgres psql -U postgres -d vocero -c "\copy (select * from meta_credentials where organization_id='$ORG') to stdout with csv header" </dev/null > "backups/meta_credentials-$(date +%Y%m%d-%H%M%S).csv"
$DC exec -T app node -e '
const c=require("crypto");let d="";process.stdin.on("data",x=>d+=x).on("end",()=>{
const j=JSON.parse(d);const k=Buffer.from(process.env.ENCRYPTION_KEY,"base64");
const iv=c.randomBytes(12);const ci=c.createCipheriv("aes-256-gcm",k,iv);
const e=Buffer.concat([ci.update(j.token,"utf8"),ci.final()]);
const q=s=>s==null?"null":"\x27"+String(s).replace(/\x27/g,"\x27\x27")+"\x27";const org=process.argv[1];
console.log(`insert into meta_credentials (id,organization_id,waba_id,messaging_account_id,phone_number_id,display_phone_number,verified_name,token_cipher,token_iv,token_tag,status)
values (${q("cred_"+c.randomBytes(9).toString("hex"))},${q(org)},${q(j.wabaId)},${q(j.messagingAccountId)},${q(j.phoneNumberId)},${q(j.displayPhoneNumber)},${q(j.verifiedName)},${q(e.toString("base64"))},${q(iv.toString("base64"))},${q(ci.getAuthTag().toString("base64"))},\x27connected\x27)
on conflict (organization_id) do update set waba_id=excluded.waba_id,messaging_account_id=excluded.messaging_account_id,phone_number_id=excluded.phone_number_id,display_phone_number=excluded.display_phone_number,verified_name=excluded.verified_name,token_cipher=excluded.token_cipher,token_iv=excluded.token_iv,token_tag=excluded.token_tag,status=\x27connected\x27,updated_at=now();`)});' "$ORG" \
| $DC exec -T postgres psql -U postgres -d vocero -v ON_ERROR_STOP=1 -q
echo "meta_credentials actualizadas para $ORG"
