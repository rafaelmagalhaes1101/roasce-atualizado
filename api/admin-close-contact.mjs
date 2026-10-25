import {
    cert,
    getApps,
    initializeApp
} from "firebase-admin/app";


import {
    getAuth
} from "firebase-admin/auth";


import {
    FieldValue,
    getFirestore
} from "firebase-admin/firestore";


/* =========================================================
   FIREBASE ADMIN
========================================================= */

const adminApp =
    getApps().length
        ? getApps()[0]
        : initializeApp({
            credential: cert({
                projectId:
                    process.env.FIREBASE_PROJECT_ID,

                clientEmail:
                    process.env.FIREBASE_CLIENT_EMAIL,

                privateKey:
                    process.env
                        .FIREBASE_PRIVATE_KEY
                        .replace(
                            /\\n/g,
                            "\n"
                        )
            })
        });


const adminAuth =
    getAuth(
        adminApp
    );


const adminDb =
    getFirestore(
        adminApp
    );


/* =========================================================
   DATA DE PAGAMENTO
========================================================= */

function parsePaymentDate(
    value
) {

    if (
        typeof value !== "string"
        ||
        !/^\d{4}-\d{2}-\d{2}$/.test(
            value
        )
    ) {

        return null;

    }


    const parts =
        value
            .split("-")
            .map(Number);


    const year =
        parts[0];

    const month =
        parts[1];

    const day =
        parts[2];


    const date =
        new Date(
            Date.UTC(
                year,
                month - 1,
                day,
                12,
                0,
                0
            )
        );


    /*
       Impede datas impossíveis como:
       31/02/2026.
    */

    if (
        date.getUTCFullYear() !== year
        ||
        date.getUTCMonth() !==
            month - 1
        ||
        date.getUTCDate() !== day
    ) {

        return null;

    }


    return date;

}


/* =========================================================
   API
========================================================= */

export default async function handler(
    request,
    response
) {

    if (
        request.method !==
            "POST"
    ) {

        return response
            .status(405)
            .json({
                error:
                    "Método não permitido."
            });

    }


    try {

        /* =================================================
           AUTENTICAÇÃO
        ================================================= */

        const authorization =
            request.headers.authorization ||
            "";


        if (
            !authorization.startsWith(
                "Bearer "
            )
        ) {

            return response
                .status(401)
                .json({
                    error:
                        "Autenticação necessária."
                });

        }


        const idToken =
            authorization.substring(
                7
            );


        const decodedToken =
            await adminAuth
                .verifyIdToken(
                    idToken
                );


        /*
           O vendedor é identificado
           exclusivamente pelo token.
        */

        const actorUid =
            decodedToken.uid;


        /* =================================================
           USUÁRIO DA EQUIPE
        ================================================= */

        const teamUserReference =
            adminDb
                .collection(
                    "team_users"
                )
                .doc(
                    actorUid
                );


        const teamUserSnapshot =
            await teamUserReference
                .get();


        if (
            !teamUserSnapshot.exists
        ) {

            return response
                .status(403)
                .json({
                    error:
                        "Usuário não autorizado."
                });

        }


        const teamUser =
            teamUserSnapshot.data();


        if (
            teamUser.active !==
                true
        ) {

            return response
                .status(403)
                .json({
                    error:
                        "Usuário inativo."
                });

        }


        const allowedRoles = [
            "owner",
            "manager",
            "staff"
        ];


        if (
            !allowedRoles.includes(
                teamUser.role
            )
        ) {

            return response
                .status(403)
                .json({
                    error:
                        "Permissão inválida."
                });

        }


        /* =================================================
           DADOS RECEBIDOS
        ================================================= */

        const {
            contactId,
            contractValueCents,
            billingType,
            paymentDueDate,
            recurringDay
        } =
            request.body || {};


        if (
            typeof contactId !==
                "string"
            ||
            !contactId.trim()
        ) {

            return response
                .status(400)
                .json({
                    error:
                        "Contato inválido."
                });

        }


        /*
           O valor sempre chega em centavos.

           Exemplo:
           R$ 1.500,00 → 150000
        */

        if (
            !Number.isSafeInteger(
                contractValueCents
            )
            ||
            contractValueCents <= 0
        ) {

            return response
                .status(400)
                .json({
                    error:
                        "Valor do contrato inválido."
                });

        }


        const allowedBillingTypes =
            new Set([
                "monthly",
                "one_time"
            ]);


        if (
            !allowedBillingTypes.has(
                billingType
            )
        ) {

            return response
                .status(400)
                .json({
                    error:
                        "Tipo de cobrança inválido."
                });

        }


        const parsedPaymentDate =
            parsePaymentDate(
                paymentDueDate
            );


        if (
            !parsedPaymentDate
        ) {

            return response
                .status(400)
                .json({
                    error:
                        "Data de pagamento inválida."
                });

        }


        /* =================================================
           RECORRÊNCIA
        ================================================= */

        let cleanRecurringDay =
            null;


        if (
            billingType ===
                "monthly"
        ) {

            const numericRecurringDay =
                Number(
                    recurringDay
                );


            if (
                !Number.isInteger(
                    numericRecurringDay
                )
                ||
                numericRecurringDay < 1
                ||
                numericRecurringDay > 31
            ) {

                return response
                    .status(400)
                    .json({
                        error:
                            "Dia recorrente inválido."
                    });

            }


            cleanRecurringDay =
                numericRecurringDay;

        }


        /* =================================================
           CONTATO
        ================================================= */

        const contactReference =
            adminDb
                .collection(
                    "contacts"
                )
                .doc(
                    contactId
                );


        const financeReference =
            adminDb
                .collection(
                    "finance_records"
                )
                .doc(
                    contactId
                );


            /* =================================================
               FECHAMENTO EM TRANSAÇÃO
            ================================================= */
            
            await adminDb.runTransaction(
                async function (transaction) {
            
                    /* -----------------------------------------
                       LEITURA DOS DADOS ATUAIS
                    ----------------------------------------- */
            
                    const contactSnapshot =
                        await transaction.get(
                            contactReference
                        );
            
                    const financeSnapshot =
                        await transaction.get(
                            financeReference
                        );
            
                    if (!contactSnapshot.exists) {
                        throw Object.assign(
                            new Error(
                                "Contato não encontrado."
                            ),
                            {
                                statusCode: 404
                            }
                        );
                    }
            
                    const currentContact =
                        contactSnapshot.data();
            
                    if (currentContact.archived === true) {
                        throw Object.assign(
                            new Error(
                                "Restaure o contato antes de fechar a venda."
                            ),
                            {
                                statusCode: 409
                            }
                        );
                    }
            
                    if (financeSnapshot.exists) {
                        throw Object.assign(
                            new Error(
                                "Este contato já possui um registro financeiro."
                            ),
                            {
                                statusCode: 409
                            }
                        );
                    }
            
                    if (currentContact.status === "fechado") {
                        throw Object.assign(
                            new Error(
                                "Este contato já está fechado."
                            ),
                            {
                                statusCode: 409
                            }
                        );
                    }
            
                    /* -----------------------------------------
                       RESPONSÁVEL PELO FECHAMENTO
                    ----------------------------------------- */
            
                    const actorEmail =
                        decodedToken.email ||
                        teamUser.email ||
                        "";
            
                    /* -----------------------------------------
                       REGISTRO FINANCEIRO
                    ----------------------------------------- */
            
                    const financeData = {
                        contactId: contactId,
            
                        contactName:
                            currentContact.name || "",
            
                        contactCompany:
                            currentContact.company || "",
            
                        service:
                            currentContact.service || "",
            
                        contractValueCents:
                            contractValueCents,
            
                        billingType:
                            billingType,
            
                        closedAt:
                            FieldValue.serverTimestamp(),
            
                        nextPaymentDueAt:
                            parsedPaymentDate,
            
                        recurringDay:
                            cleanRecurringDay,
            
                        paymentStatus:
                            "pending",
            
                        paidAt:
                            null,
            
                        closedByUid:
                            actorUid,
            
                        closedByEmail:
                            actorEmail,
            
                        closedByRole:
                            teamUser.role,
            
                        createdAt:
                            FieldValue.serverTimestamp(),
            
                        updatedAt:
                            FieldValue.serverTimestamp()
                    };
            
                    /* -----------------------------------------
                       AUDITORIA
                    ----------------------------------------- */
            
                    const auditReference =
                        adminDb
                            .collection("audit_logs")
                            .doc();
            
                    const oldStatus =
                        currentContact.status || "novo";
            
                    const auditData = {
                        actorUid: actorUid,
                        actorEmail: actorEmail,
                        actorRole: teamUser.role,
            
                        contactId: contactId,
            
                        contactName:
                            currentContact.name || "",
            
                        contactCompany:
                            currentContact.company || "",
            
                        action:
                            "contact_closed",
            
                        changes: {
                            status: {
                                from: oldStatus,
                                to: "fechado"
                            },
            
                            financialClosing: {
                                created: true
                            }
                        },
            
                        createdAt:
                            FieldValue.serverTimestamp()
                    };
            
                    /* -----------------------------------------
                       GRAVAÇÃO CONJUNTA
                    ----------------------------------------- */
            
                    transaction.update(
                        contactReference,
                        {
                            status: "fechado",
                            lossReason: null,
                            lostAt: null,
                            nextContactAt: null,
            
                            updatedAt:
                                FieldValue.serverTimestamp()
                        }
                    );
            
                    transaction.set(
                        financeReference,
                        financeData
                    );
            
                    transaction.set(
                        auditReference,
                        auditData
                    );
                    
                    /* =================================================
                       ATIVIDADE RECENTE — VENDA FECHADA
                    ================================================= */
                    
                    const activityReference =
                        adminDb
                            .collection("activity_feed")
                            .doc();
                    
                    const activityData = {
                    
                        type:
                            "sale_closed",
                    
                        contactId:
                            contactId,
                    
                        contactName:
                            currentContact.name || "",
                    
                        contactCompany:
                            currentContact.company || "",
                    
                        service:
                            currentContact.service || "",
                    
                        origin:
                            currentContact.origin ||
                            (
                                currentContact.source === "site"
                                    ? "site"
                                    : "nao_informado"
                            ),
                    
                        fromStatus:
                            oldStatus,
                    
                        toStatus:
                            "fechado",
                    
                        fromNextContactAt:
                            currentContact.nextContactAt || null,
                    
                        toNextContactAt:
                            null,
                    
                        actorUid:
                            actorUid,
                    
                        actorEmail:
                            actorEmail,
                    
                        actorRole:
                            teamUser.role,
                    
                        createdAt:
                            FieldValue.serverTimestamp()
                    
                    };
                    
                    transaction.set(
                        activityReference,
                        activityData
                    );
            
                }
            );


        return response
            .status(200)
            .json({

                success:
                    true,

                contactId:
                    contactId

            });

    }

    catch (error) {

        if (
            error.statusCode === 404 ||
            error.statusCode === 409
        ) {
            return response
                .status(error.statusCode)
                .json({
                    error: error.message
                });
        }

        console.error(
            "Erro ao fechar venda:",
            error
        );


        return response
            .status(500)
            .json({
                error:
                    "Não foi possível concluir o fechamento."
            });

    }

}
