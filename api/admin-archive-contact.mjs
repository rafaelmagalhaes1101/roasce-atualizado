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
           USUÁRIO ADMINISTRATIVO
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


        /*
           Arquivamento é uma ação
           administrativa.

           Staff não pode arquivar
           ou restaurar contatos.
        */

        const allowedRoles = [
            "owner",
            "manager"
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
                        "Você não possui permissão para arquivar contatos."
                });

        }


        /* =================================================
           DADOS
        ================================================= */

        const {
            contactId,
            archived
        } =
            request.body || {};


        if (
            !contactId ||
            typeof contactId !==
                "string"
        ) {

            return response
                .status(400)
                .json({
                    error:
                        "Contato inválido."
                });

        }


        if (
            typeof archived !==
                "boolean"
        ) {

            return response
                .status(400)
                .json({
                    error:
                        "Estado de arquivamento inválido."
                });

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


        const result = await adminDb.runTransaction(
            async function (transaction) {
                const contactSnapshot =
                    await transaction.get(contactReference);

                if (!contactSnapshot.exists) {
                    return {
                        found: false
                    };
                }

                const currentContact = contactSnapshot.data();

                const currentArchived =
                    currentContact.archived === true;

                if (currentArchived === archived) {
                    return {
                        success: true,
                        changed: false,
                        archived: currentArchived
                    };
                }

                const actorEmail =
                    decodedToken.email ||
                    teamUser.email ||
                    "";

                const eventType = archived
                    ? "contact_archived"
                    : "contact_restored";

                const auditReference = adminDb
                    .collection("audit_logs")
                    .doc();

                const activityReference = adminDb
                    .collection("activity_feed")
                    .doc();

                const auditData = {
                    actorUid,
                    actorEmail,
                    actorRole: teamUser.role,

                    contactId,
                    contactName: currentContact.name || "",
                    contactCompany: currentContact.company || "",

                    action: eventType,

                    changes: {
                        archived: {
                            from: currentArchived,
                            to: archived
                        }
                    },

                    createdAt: FieldValue.serverTimestamp()
                };

                const activityData = {
                    type: eventType,

                    contactId,
                    contactName: currentContact.name || "",
                    contactCompany: currentContact.company || "",
                    service: currentContact.service || "",

                    origin:
                        currentContact.origin ||
                        (
                            currentContact.source === "site"
                                ? "site"
                                : "nao_informado"
                        ),

                    fromStatus: null,
                    toStatus: null,

                    fromNextContactAt: null,
                    toNextContactAt: null,

                    fromArchived: currentArchived,
                    toArchived: archived,

                    actorUid,
                    actorEmail,
                    actorRole: teamUser.role,

                    createdAt: FieldValue.serverTimestamp()
                };

                transaction.update(contactReference, {
                    archived,

                    archivedAt: archived
                        ? FieldValue.serverTimestamp()
                        : null,

                    updatedAt: FieldValue.serverTimestamp()
                });

                transaction.set(auditReference, auditData);
                transaction.set(activityReference, activityData);

                return {
                    success: true,
                    changed: true,
                    archived
                };
            }
        );

        if (result.found === false) {
            return response.status(404).json({
                error: "Contato não encontrado."
            });
        }

        return response.status(200).json(result);

        } catch (error) {

        console.error(
            "Erro ao arquivar contato:",
            error
        );


        return response
            .status(500)
            .json({
                error:
                    "Não foi possível alterar o arquivamento do contato."
            });

    }

}
