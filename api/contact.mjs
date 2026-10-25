import {
    FieldValue,
    Timestamp
} from "firebase-admin/firestore";

import {
    db
} from "../lib/firebase-admin.mjs";


/* =========================================================
   API DE CONTATO — ROASCE
========================================================= */

export async function POST(request) {

    try {

        /* -----------------------------------------
           RECEBE DADOS
        ----------------------------------------- */

        const body =
            await request.json();
        

        const name =
            String(body.name || "")
                .trim();

        const company =
            String(body.company || "")
                .trim();

        const contact =
            String(body.contact || "")
                .trim();

        const service =
            String(body.service || "")
                .trim();

        const message =
            String(body.message || "")
                .trim();

        const turnstileToken =
            String(body.turnstileToken || "")
                .trim();
        
        /* -----------------------------------------
           VALIDAÇÃO
        ----------------------------------------- */

        if (
            !name ||
            !contact ||
            !message
        ) {

            return Response.json(
                {
                    success: false,
                    message:
                        "Preencha os campos obrigatórios."
                },
                {
                    status: 400
                }
            );

        }


        /* -----------------------------------------
           LIMITES BÁSICOS
        ----------------------------------------- */

        if (
            name.length > 120 ||
            company.length > 150 ||
            contact.length > 150 ||
            service.length > 100 ||
            message.length > 3000
        ) {

            return Response.json(
                {
                    success: false,
                    message:
                        "Um ou mais campos ultrapassaram o tamanho permitido."
                },
                {
                    status: 400
                }
            );

        }

        /* -----------------------------------------
           TURNSTILE — VALIDAÇÃO
        ----------------------------------------- */
        
        if (!turnstileToken) {
        
            return Response.json(
                {
                    success: false,
                    message:
                        "Verificação de segurança ausente."
                },
                {
                    status: 403
                }
            );
        
        }
        
        
        const turnstileSecret =
            process.env.TURNSTILE_SECRET_KEY;
        
        
        if (!turnstileSecret) {
        
            console.error(
                "TURNSTILE_SECRET_KEY não configurada."
            );
        
            return Response.json(
                {
                    success: false,
                    message:
                        "Erro de configuração do servidor."
                },
                {
                    status: 500
                }
            );
        
        }
        
        
        const verificationResponse =
            await fetch(
                "https://challenges.cloudflare.com/turnstile/v0/siteverify",
                {
        
                    method:
                        "POST",
        
                    headers: {
                        "Content-Type":
                            "application/x-www-form-urlencoded"
                    },
        
                    body:
                        new URLSearchParams({
        
                            secret:
                                turnstileSecret,
        
                            response:
                                turnstileToken
        
                        })
        
                }
            );
        
        
        const verification =
            await verificationResponse.json();
        
        
        if (
            !verification.success ||
            verification.action !==
                "contact_form"
        ) {
        
            console.warn(
                "Turnstile recusado:",
                verification
            );
        
            return Response.json(
                {
                    success: false,
                    message:
                        "Não foi possível validar a verificação de segurança."
                },
                {
                    status: 403
                }
            );
        
        }

        /* -----------------------------------------
           RETENÇÃO DE DADOS — 24 MESES
        ----------------------------------------- */
        
        const expirationDate =
            new Date();
        
        
        expirationDate.setUTCFullYear(
            expirationDate.getUTCFullYear() + 2
        );
        
        
        const expiresAt =
            Timestamp.fromDate(
                expirationDate
            );
        
        /* -----------------------------------------
           SALVA NO FIRESTORE
        ----------------------------------------- */

        const document =
            await db
                .collection("contacts")
                .add({
        
                    name,
        
                    company:
                        company || null,
        
                    contact,
        
                    service:
                        service || "Ainda não definido",
        
                    message,
        
                    status:
                        "novo",
        
                    source:
                        "site",
        
                    createdAt:
                        FieldValue.serverTimestamp(),
        
                    updatedAt:
                        FieldValue.serverTimestamp(),
        
                    expiresAt
        
                });


        /* -----------------------------------------
           RESPOSTA
        ----------------------------------------- */

        return Response.json(
            {

                success: true,

                id:
                    document.id,

                message:
                    "Mensagem recebida com sucesso."

            },
            {
                status: 201
            }
        );

    }

    catch (error) {

        console.error(
            "Erro ao salvar contato:",
            error
        );


        return Response.json(
            {

                success: false,

                message:
                    "Não foi possível enviar sua mensagem."

            },
            {
                status: 500
            }
        );

    }

}


/* =========================================================
   BLOQUEIA OUTROS MÉTODOS
========================================================= */

export function GET() {

    return Response.json(
        {
            message:
                "Método não permitido."
        },
        {
            status: 405
        }
    );

}
