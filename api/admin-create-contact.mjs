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
                    process.env
                        .FIREBASE_PROJECT_ID,

                clientEmail:
                    process.env
                        .FIREBASE_CLIENT_EMAIL,

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
   AUXILIAR
========================================================= */

function cleanString(
    value,
    maxLength
) {

    if (
        value === undefined ||
        value === null
    ) {

        return "";

    }


    if (
        typeof value !==
        "string"
    ) {

        return null;

    }


    const clean =
        value.trim();


    if (
        clean.length >
        maxLength
    ) {

        return null;

    }


    return clean;

}

/* =========================================================
   ORIGEM E TAGS
========================================================= */

const allowedOrigins =
    new Set([
        "site",
        "instagram",
        "whatsapp",
        "indicacao",
        "prospeccao",
        "evento",
        "google",
        "outro",
        "nao_informado"
    ]);


function normalizeOrigin(
    value,
    fallback = "nao_informado"
) {

    if (
        value === undefined
    ) {

        return fallback;

    }


    if (
        value === null ||
        value === ""
    ) {

        return "nao_informado";

    }


    if (
        typeof value !==
        "string"
    ) {

        return null;

    }


    const clean =
        value
            .trim()
            .toLowerCase();


    if (!clean) {

        return "nao_informado";

    }


    return allowedOrigins.has(
        clean
    )
        ? clean
        : null;

}


function normalizeTags(
    value,
    fallback = []
) {

    if (
        value === undefined
    ) {

        return [
            ...fallback
        ];

    }


    if (
        value === null
    ) {

        return [];

    }


    if (
        !Array.isArray(value) ||
        value.length > 12
    ) {

        return null;

    }


    const normalizedTags = [];

    const seenTags =
        new Set();


    for (
        const item
        of value
    ) {

        if (
            typeof item !==
            "string"
        ) {

            return null;

        }


        const clean =
            item.trim();


        if (!clean) {

            continue;

        }


        if (
            clean.length > 40
        ) {

            return null;

        }


        const key =
            clean.toLowerCase();


        if (
            seenTags.has(key)
        ) {

            continue;

        }


        seenTags.add(key);

        normalizedTags.push(
            clean
        );

    }


    return normalizedTags;

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
            name,
            company,
            contact,
            service,
            message,
            notes,
            nextContactAt,
            origin,
            tags
        } =
            request.body || {};


        const cleanName =
            cleanString(
                name,
                120
            );


        const cleanCompany =
            cleanString(
                company,
                160
            );


        const cleanContact =
            cleanString(
                contact,
                250
            );


        const cleanService =
            cleanString(
                service,
                120
            );


        const cleanMessage =
            cleanString(
                message,
                2000
            );


        const cleanNotes =
            cleanString(
                notes,
                3000
            );

        const cleanOrigin =
            normalizeOrigin(
                origin
            );
        
        
        const cleanTags =
            normalizeTags(
                tags
            );

        if (
            !cleanName
        ) {

            return response
                .status(400)
                .json({
                    error:
                        "Informe o nome do contato."
                });

        }


        if (
            !cleanContact
        ) {

            return response
                .status(400)
                .json({
                    error:
                        "Informe um telefone, e-mail ou outro contato."
                });

        }


       if (
            cleanCompany === null ||
            cleanService === null ||
            cleanMessage === null ||
            cleanNotes === null ||
            cleanOrigin === null ||
            cleanTags === null
        ) {

            return response
                .status(400)
                .json({
                    error:
                        "Um ou mais campos possuem conteúdo inválido."
                });

        }


        /* =================================================
           PRÓXIMO CONTATO
        ================================================= */

        let parsedNextContact =
            null;


        if (
            nextContactAt
        ) {

            if (
                typeof nextContactAt !==
                "string"
            ) {

                return response
                    .status(400)
                    .json({
                        error:
                            "Data de próximo contato inválida."
                    });

            }


            const date =
                new Date(
                    nextContactAt
                );


            if (
                Number.isNaN(
                    date.getTime()
                )
            ) {

                return response
                    .status(400)
                    .json({
                        error:
                            "Data de próximo contato inválida."
                    });

            }


            parsedNextContact =
                date;

        }


        /* =================================================
           NOVO CONTATO
        ================================================= */

        const contactReference =
            adminDb
                .collection(
                    "contacts"
                )
                .doc();


        const actorEmail =
            decodedToken.email ||
            teamUser.email ||
            "";


        const contactData = {

            name:
                cleanName,

            company:
                cleanCompany,

            contact:
                cleanContact,

            service:
                cleanService,

            message:
                cleanMessage,

            notes:
                cleanNotes,

            status:
                "novo",

            nextContactAt:
                parsedNextContact,

            lossReason:
                null,

            lostAt:
                null,

            archived:
                false,

            archivedAt:
                null,

            source:
                "manual",

            origin:
                cleanOrigin,
            
            tags:
                cleanTags,
            
            createdByUid:
                actorUid,

            createdByEmail:
                actorEmail,

            createdByRole:
                teamUser.role,

            createdAt:
                FieldValue
                    .serverTimestamp(),

            updatedAt:
                FieldValue
                    .serverTimestamp()

        };


        /* =================================================
           AUDITORIA
        ================================================= */

        const auditReference =
            adminDb
                .collection(
                    "audit_logs"
                )
                .doc();

        const activityReference =
            adminDb
                .collection(
                    "activity_feed"
                )
                .doc();

        const auditData = {

            actorUid:
                actorUid,

            actorEmail:
                actorEmail,

            actorRole:
                teamUser.role,

            contactId:
                contactReference.id,

            contactName:
                cleanName,

            contactCompany:
                cleanCompany,

            action:
                "contact_created",

           changes: {

                created: {
            
                    source:
                        "manual",
            
                    origin:
                        cleanOrigin,
            
                    tags:
                        cleanTags
            
                }
            
            },

            createdAt:
                FieldValue
                    .serverTimestamp()

        };

        /* =================================================
           ATIVIDADE RECENTE
        ================================================= */
        
        const activityData = {
        
            type:
                "lead_created",
        
            contactId:
                contactReference.id,
        
            contactName:
                cleanName,
        
            contactCompany:
                cleanCompany || "",
        
            service:
                cleanService || "",

            origin:
                cleanOrigin,
        
            fromStatus:
                null,
        
            toStatus:
                "novo",
        
            fromNextContactAt:
                null,
        
            toNextContactAt:
                parsedNextContact,
        
            actorUid:
                actorUid,
        
            actorEmail:
                actorEmail,
        
            actorRole:
                teamUser.role,
        
            createdAt:
                FieldValue
                    .serverTimestamp()
        
        };

        /* =================================================
           CRIAÇÃO ATÔMICA
        ================================================= */

const batch = adminDb.batch();
        
       batch.set(
            contactReference,
            contactData
        );
        
        
        batch.set(
            auditReference,
            auditData
        );
        
        
        batch.set(
            activityReference,
            activityData
        );
        
        
        await batch.commit();


        return response
            .status(201)
            .json({

                success:
                    true,

                contactId:
                    contactReference.id

            });

    }

    catch (error) {

        console.error(
            "Erro ao criar contato manual:",
            error
        );


        return response
            .status(500)
            .json({
                error:
                    "Não foi possível criar o contato."
            });

    }

}
